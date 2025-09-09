// pages/api/validate.js
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  // terima GET & POST biar fleksibel dari berbagai executor
  const method = req.method || "GET";
  if (method !== "GET" && method !== "POST") {
    return res.status(405).json({ ok: false, msg: "Method not allowed" });
  }

  try {
    const fromBody = req.body && typeof req.body === "object" ? req.body.key : null;
    const fromQuery = req.query && typeof req.query.key === "string" ? req.query.key : null;

    const key = (fromBody || fromQuery || "").toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!key) return res.status(400).json({ ok: false, msg: "key required" });

    const ip =
      (req.headers["x-forwarded-for"] || "").toString().split(",")[0] ||
      req.headers["cf-connecting-ip"] ||
      req.headers["x-real-ip"] ||
      "0.0.0.0";

    // cek exist (TTL > 0)
    const ttl = await redis.ttl(`key:${key}`);
    if (ttl <= 0) {
      // bersihkan index/meta jika kadaluarsa
      await redis.zrem("keys:index", key);
      await redis.del(`keymeta:${key}`);
      return res.status(410).json({ ok: false, msg: "expired" });
    }

    // cek metadata + kunci ke IP yang sama
    const meta = await redis.hgetall(`keymeta:${key}`);
    if (!meta || !meta.ip) {
      return res.status(403).json({ ok: false, msg: "metadata missing" });
    }

    if (meta.ip !== ip) {
      return res.status(403).json({ ok: false, msg: "ip mismatch" });
    }

    // sukses
    const now = Date.now();
    return res.status(200).json({
      ok: true,
      key,
      ttl,
      createdAt: Number(meta.createdAt || now - ttl * 1000),
      expiresAt: Number(meta.expiresAt || now + ttl * 1000),
      ip: meta.ip,
    });
  } catch {
    return res.status(500).json({ ok: false, msg: "Internal error" });
  }
}
