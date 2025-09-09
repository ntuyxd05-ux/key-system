// List admin (hanya nama, token tidak ditampilkan)
import { Redis } from "@upstash/redis";
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, msg: "Method not allowed" });
  try {
    const map = await redis.hgetall("admin:users"); // { username: token }
    const users = map ? Object.keys(map) : [];
    return res.status(200).json({ ok: true, users });
  } catch {
    return res.status(500).json({ ok: false, msg: "Internal error" });
  }
}
