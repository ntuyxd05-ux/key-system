// Tambah admin tanpa redeploy
// Body: { username: "alice", password: "alice123" }
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, msg: "Method not allowed" });
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ ok: false, msg: "username & password required" });

    // token basic = base64("user:pass")
    const token = Buffer.from(`${username}:${password}`).toString("base64");

    await redis.hset("admin:users", { [username]: token });
    await redis.sadd("admin:tokens", token);

    return res.status(200).json({ ok: true, msg: "Admin added", username });
  } catch {
    return res.status(500).json({ ok: false, msg: "Internal error" });
  }
}
