// pages/api/generate.js
import { Redis } from "@upstash/redis";
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  // TERIMA GET & POST supaya tidak 405 lagi dari device/aplikasi apa pun
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ ok: false, msg: "Method not allowed" });
  }

  try {
    const ip =
      (req.headers["x-forwarded-for"] || "").toString().split(",")[0] ||
      "0.0.0.0";
    const now = Date.now();
    const expireMs = 24 * 60 * 60 * 1000;
    const expireAt = now + expireMs;

    // generate key
    const rnd = Math.random().toString(16).slice(2, 10).toUpperCase();
    const key = rnd + Math.random().toString(16).slice(2, 6).toUpperCase();

    // simpan utama (TTL 24h)
    await redis.set(`key:${key}`, "1", { ex: 86400 });
    // simpan metadata
    await redis.hset(`keymeta:${key}`, { createdAt: now, expiresAt: expireAt, ip });
    await redis.expire(`keymeta:${key}`, 86400);
    // simpan index untuk listing
    await redis.zadd("keys:index", { score: now, member: key });

    return res.status(200).json({ ok: true, key, expireAt });
  } catch (e) {
    return res.status(500).json({ ok: false, msg: "Internal error" });
  }
}
