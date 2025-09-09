// middleware.js (potongan yang perlu diubah/ditambah)
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const ENV_TOKENS = (process.env.ADMIN_BASIC_TOKENS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean); // daftar "Basic <base64(user:pass)>", tanpa "Basic "

function getIP(req) {
  const xff = req.headers.get("x-forwarded-for");
  return xff ? xff.split(",")[0].trim() : req.ip || "0.0.0.0";
}

async function checkBasicAuth(req) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Basic ")) return false;
  const token = auth.slice(6); // hanya base64 part

  // 1) Cek yang dari ENV (cepat, tanpa Redis)
  if (ENV_TOKENS.includes(token)) return true;

  // 2) Cek yang dinamis di Redis (tanpa redeploy)
  // SADD admin:tokens <token>
  const isMember = await redis.sismember("admin:tokens", token);
  return isMember === 1;
}

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Secure Area"' },
  });
}

async function rateLimit({ key, limit, windowSec }) {
  const k = `rl:${key}`;
  const count = await redis.incr(k);
  if (count === 1) await redis.expire(k, windowSec);
  return count <= limit;
}

export async function middleware(req) {
  const { pathname } = new URL(req.url);
  const ip = getIP(req);

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/revoke") || pathname.startsWith("/api/admins")) {
    if (!(await checkBasicAuth(req))) return unauthorized();
    const ok = await rateLimit({ key: `revoke:${ip}`, limit: 10, windowSec: 60 });
    if (!ok) return new NextResponse("Too Many Requests (admin)", { status: 429 });
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/generate")) {
    const ok = await rateLimit({ key: `gen:${ip}`, limit: 5, windowSec: 60 });
    if (!ok) return new NextResponse("Too Many Requests (generate)", { status: 429 });
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/validate")) {
    const ok = await rateLimit({ key: `val:${ip}`, limit: 60, windowSec: 60 });
    if (!ok) return new NextResponse("Too Many Requests (validate)", { status: 429 });
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/api/revoke", "/api/generate", "/api/validate", "/api/admins/:path*"],
};
