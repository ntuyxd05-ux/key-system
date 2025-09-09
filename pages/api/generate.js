import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });

export async function POST(req) {
  try {
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0] || "0.0.0.0";
    const now = Date.now();
    const expireMs = 24 * 60 * 60 * 1000;
    const expireAt = now + expireMs;

    const rnd = Math.random().toString(16).slice(2, 10).toUpperCase();
    const key = rnd + Math.random().toString(16).slice(2, 6).toUpperCase();

    await redis.set(`key:${key}`, "1", { ex: 86400 });

    await redis.hset(`keymeta:${key}`, { createdAt: now, expiresAt: expireAt, ip });
    await redis.expire(`keymeta:${key}`, 86400);
    await redis.zadd("keys:index", { score: now, member: key });

    return NextResponse.json({ ok: true, key, expireAt }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, msg: "Internal error" }, { status: 500 });
  }
}
