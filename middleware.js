import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const hasRedis = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = hasRedis ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN }) : null;

const ENV_TOKENS = (process.env.ADMIN_BASIC_TOKENS || "")
  .split(",").map(s => s.trim()).filter(Boolean);
const ENV_USER = process.env.ADMIN_USER || "";
const ENV_PASS = process.env.ADMIN_PASS || "";

function unauthorized() {
  return new NextResponse("Authentication required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Secure Area"' } });
}
function getIP(req) {
  const xff = req.headers.get("x-forwarded-for");
  return xff ? xff.split(",")[0].trim() : req.ip || "0.0.0.0";
}
async function rateLimit({ key, limit, windowSec }) {
  if (!redis) return true;
  const k = `rl:${key}`;
  const count = await redis.incr(k);
  if (count === 1) await redis.expire(k, windowSec);
  return count <= limit;
}
async function checkBasicAuth(req) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Basic ")) return false;
  const token = auth.slice(6).trim();

  if (ENV_TOKENS.includes(token)) return true;

  try {
    const decoded = atob(token);
    const i = decoded.indexOf(":");
    if (i > -1) {
      const u = decoded.slice(0, i), p = decoded.slice(i + 1);
      if (u === ENV_USER && p === ENV_PASS && u && p) return true;
    }
  } catch {}

  if (redis) {
    try { const m = await redis.sismember("admin:tokens", token); if (m === 1) return true; } catch {}
  }
  return false;
}

export async function middleware(req) {
  const url = new URL(req.url);
  const path = url.pathname;
  const ip = getIP(req);

  if (path === "/admin" || path.startsWith("/api/revoke") || path.startsWith("/api/admins")) {
    if (!(await checkBasicAuth(req))) return unauthorized();
    const ok = await rateLimit({ key: `admin:${ip}`, limit: 20, windowSec: 60 });
    if (!ok) return new NextResponse("Too Many Requests (admin)", { status: 429 });
    return NextResponse.next();
  }

  if (path.startsWith("/api/generate")) {
    const ok = await rateLimit({ key: `gen:${ip}`, limit: 5, windowSec: 60 });
    if (!ok) return new NextResponse("Too Many Requests (generate)", { status: 429 });
    return NextResponse.next();
  }

  if (path.startsWith("/api/validate")) {
    const ok = await rateLimit({ key: `val:${ip}`, limit: 60, windowSec: 60 });
    if (!ok) return new NextResponse("Too Many Requests (validate)", { status: 429 });
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/api/revoke", "/api/admins/:path*", "/api/generate", "/api/validate"]
};
