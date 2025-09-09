// pages/api/admins/keys/list.js
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, msg: "Method not allowed" });
  }

  try {
    const limit  = Math.min(parseInt(req.query.limit || "50", 10), 200);
    const offset = parseInt(req.query.offset || "0", 10);

    // ⬇️ Upstash SDK: pakai zrange dengan { rev: true } (bukan zrevrange)
    const end = offset + limit - 1;
    const members = await redis.zrange("keys:index", offset, end, { rev: true });

    const now = Date.now();
    const items = [];

    for (const key of members) {
      const ttl = await redis.ttl(`key:${key}`);
      if (ttl <= 0) {
        // bereskan index kalau key sudah expired
        await redis.zrem("keys:index", key);
        await redis.del(`keymeta:${key}`);
        continue;
      }
      const meta = (await redis.hgetall(`keymeta:${key}`)) || {};
      items.push({
        key,
        ttl, // detik
        createdAt: Number(meta.createdAt || 0),
        expiresAt: Number(meta.expiresAt || now + ttl * 1000),
        ip: meta.ip || "-",
      });
    }

    return res.status(200).json({ ok: true, items, offset, limit });
  } catch (e) {
    // kirim pesan agar keliatan jelas di UI
    return res.status(500).json({ ok: false, msg: e?.message || "Internal error" });
  }
}
