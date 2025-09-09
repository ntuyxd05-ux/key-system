// Hapus admin
// Body: { username: "alice" }
import { Redis } from "@upstash/redis";
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, msg: "Method not allowed" });
  try {
    const { username } = req.body || {};
    if (!username) return res.status(400).json({ ok: false, msg: "username required" });

    const token = await redis.hget("admin:users", username);
    if (!token) return res.status(404).json({ ok: false, msg: "Admin not found" });

    await redis.hdel("admin:users", username);
    await redis.srem("admin:tokens", token);

    return res.status(200).json({ ok: true, msg: "Admin removed", username });
  } catch {
    return res.status(500).json({ ok: false, msg: "Internal error" });
  }
}
