// pages/api/revoke.js
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, msg: "Method not allowed" });
  }
  try {
    const { key } = req.body || {};
    if (!key) return res.status(400).json({ ok: false, msg: "key required" });

    // Hapus key utama
    await redis.del(`key:${key}`);

    // Bersihkan index & metadata agar daftar di /admin tetap rapi
    await redis.zrem("keys:index", key);
    await redis.del(`keymeta:${key}`);

    return res.status(200).json({ ok: true, msg: "Key revoked" });
  } catch (e) {
    return res.status(500).json({ ok: false, msg: "Internal error" });
  }
}
