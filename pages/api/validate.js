import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  const { key } = req.query;
  if (!key) return res.status(400).json({ valid: false, msg: "Key required" });

  try {
    const exists = await redis.get(`key:${key}`);
    if (!exists) return res.status(404).json({ valid: false, msg: "Key not found or expired" });

    return res.status(200).json({ valid: true, msg: "Key valid" });
  } catch (e) {
    return res.status(500).json({ valid: false, msg: "Internal error" });
  }
}
