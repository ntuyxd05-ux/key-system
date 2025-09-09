// pages/api/generate.js
import { Redis } from "@upstash/redis";
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  // TERIMA POST & GET agar tidak 405 dari client yang berbeda
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ ok: false, msg: "Method not allowed" });
  }

  try {
    const ip =
      (req.headers["x-forwarded-for"] || "").toString().split(",")[0] ||
      "0.0.0.0";

    // ====== 1 IP = 1 key aktif ======
    // Tanpa merubah struktur data: kita scan index yang sudah ada.
    // Ambil paling baru (rev=true) sampai 500 item ke belakang (cukup untuk kebanyakan kasus).
    const members = await redis.zrange("keys:index", 0, 499, { rev: true });
    for (const k of members) {
      const ttl = await redis.ttl(`key:${k}`);
      if (ttl <= 0) {
        // bereskan index kalau sudah kadaluarsa
        await redis.zrem("keys:index", k);
        await redis.del(`keymeta:${k}`);
        continue;
      }
      const meta = await redis.hgetall(`keymeta:${k}`);
      if (meta && meta.ip === ip) {
        // IP ini masih punya key aktif → JANGAN buat baru.
        return res.status(200).json({
          ok: true,
          key: k,
          expireAt: Number(meta.expiresAt || Date.now() + ttl * 1000),
          reused: true,
        });
      }
    }
    // =================================

    // Tidak ada key aktif untuk IP ini → buat baru
    const now = Date.now();
    const expireMs = 24 * 60 * 60 * 1000; // 24 jam
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

    return res.status(200).json({ ok: true, key, expireAt, reused: false });
  } catch (e) {
    return res.status(500).json({ ok: false, msg: "Internal error" });
  }
}
