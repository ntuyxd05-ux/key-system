// middleware.js — Basic Auth + Rate Limit untuk Vercel Edge
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";


const redis = new Redis({
url: process.env.UPSTASH_REDIS_REST_URL,
token: process.env.UPSTASH_REDIS_REST_TOKEN,
});


function getIP(req) {
const xff = req.headers.get("x-forwarded-for");
if (xff) return xff.split(",")[0].trim();
return req.ip || "0.0.0.0";
}


function checkBasicAuth(req) {
const auth = req.headers.get("authorization") || "";
if (!auth.startsWith("Basic ")) return false;
try {
const decoded = atob(auth.slice(6));
const i = decoded.indexOf(":");
if (i === -1) return false;
const user = decoded.slice(0, i);
const pass = decoded.slice(i + 1);
return user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS;
} catch {
return false;
}
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


// Proteksi admin & revoke dengan Basic Auth + RL
if (pathname.startsWith("/admin") || pathname.startsWith("/api/revoke")) {
if (!checkBasicAuth(req)) return unauthorized();
const ok = await rateLimit({ key: `revoke:${ip}`, limit: 10, windowSec: 60 });
if (!ok) return new NextResponse("Too Many Requests (admin revoke)", { status: 429 });
return NextResponse.next();
}


// Rate limit publik
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
};
