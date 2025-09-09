// middleware.js
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

/** ====== Optional Redis (untuk rate limit & admin dinamis) ====== */
const hasRedis =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasRedis
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

/** ====== Sumber kredensial admin ====== */
// 1) Token base64 dari ENV: "dXNlcjpwYXNz,dXNlcjI6cDEyMw=="
const ENV_TOKENS = (process.env.ADMIN_BASIC_TOKENS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// 2) Pasangan user/pass dari ENV
const ENV_USER = process.env.ADMIN_USER || "";
const ENV_PASS = process.env.ADMIN_PASS || "";

/** ====== Helpers ====== */
function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Secure Area"' },
  });
}

function getIP(req) {
  const xff = req.headers.get("x-forwarded-for");
  return xff ? xff.split(",")[0].trim() : req.ip || "0.0.0.0";
}

// Rate limit berbasis Redis (fallback: selalu lolos jika Redis tidak ada)
async function rateLimit({ key, limit, windowSec }) {
  if (!redis) return true;
  const k = `rl:${key}`;
  const count = await redis.incr(k);
  if (count === 1) await redis.expire(k, windowSec);
  return count <= limit;
}

/** ====== Cek Basic Auth dari 3 sumber ====== */
async function checkBasicAuth(req) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Basic ")) return false;

  const token = auth.slice(6).trim(); // hanya bagian base64

  // a) cocok dengan daftar token ENV?
  if (ENV_TOKENS.includes(token)) return true;

  // b) cocok dengan ADMIN_USER/ADMIN_PASS ENV?
  try {
    const decoded = atob(token); // Web API tersedia di Edge runtime
    const idx = decoded.indexOf(":");
    if (idx > -1) {
      const u = decoded.slice(0, idx);
      const p = decoded.slice(idx + 1);
      if (u === ENV_USER && p === ENV_PASS && u && p) return true;
    }
  } catch {
    // abaikan kesalahan decode
  }

  // c) cocok dengan admin dinamis di Redis? (simpan base64 token di set "admin:tokens")
  if (redis) {
    try {
      const isMember = await redis.sismember("admin:tokens", token);
      if (isMember === 1) return true;
    } catch {
      // jika Redis error, jangan blokir hanya karena cek ini
    }
  }

  return false;
}

/** ====== Middleware utama ====== */
export async function middleware(req) {
  const url = new URL(req.url);
  const path = url.pathname;
  const ip = getIP(req);

  // Rute admin: wajib Basic Auth + rate limit admin
  if (
    path === "/admin" ||
    path.startsWith("/api/revoke") ||
    path.startsWith("/api/admins")
  ) {
    if (!(await checkBasicAuth(req))) return unauthorized();

    const ok = await rateLimit({
      key: `admin:${ip}`,
      limit: 20, // 20 request / menit per IP untuk rute admin
      windowSec: 60,
    });
    if (!ok) return new NextResponse("Too Many Requests (admin)", { status: 429 });

    return NextResponse.next();
  }

  // Rute publik: rate limit ringan
  if (path.startsWith("/api/generate")) {
    const ok = await rateLimit({
      key: `gen:${ip}`,
      limit: 5, // 5 req / menit
      windowSec: 60,
    });
    if (!ok) return new NextResponse("Too Many Requests (generate)", { status: 429 });
    return NextResponse.next();
  }

  if (path.startsWith("/api/validate")) {
    const ok = await rateLimit({
      key: `val:${ip}`,
      limit: 60, // 60 req / menit
      windowSec: 60,
    });
    if (!ok) return new NextResponse("Too Many Requests (validate)", { status: 429 });
    return NextResponse.next();
  }

  return NextResponse.next();
}

/** ====== Matcher: tentukan rute yang dipantau middleware ====== */
export const config = {
  matcher: [
    "/admin",
    "/api/revoke",
    "/api/admins/:path*",
    "/api/generate",
    "/api/validate",
  ],
};
