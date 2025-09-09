import { Redis } from "@upstash/redis";
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, msg: "Method not allowed" });

  try {
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);
    const offset = parseInt(req.query.offset || "0", 10);

    // ambil dari zset terbaru -> terlama
    const members = await redis.zrevrange("keys:index", offset, offset + limit - 1);
    const now = Date.now();
    const rows = [];

    for (const k of members) {
      // cek masih aktif?
      const ttl = await redis.ttl(`key:${k}`);
      if (ttl <= 0) {
        // bersihkan index kalau sudah expired
        await redis.zrem("keys:index", k);
        await redis.del(`keymeta:${k}`);
        continue;
      }
      const meta = (await redis.hgetall(`keymeta:${k}`)) || {};
      rows.push({
        key: k,
        ttl,
        createdAt: Number(meta.createdAt || 0),
        expiresAt: Number(meta.expiresAt || now + ttl * 1000),
        ip: meta.ip || "-"
      });
    }

    return res.status(200).json({ ok: true, items: rows, offset, limit });
  } catch (e) {
    return res.status(500).json({ ok: false, msg: "Internal error" });
  }
}
