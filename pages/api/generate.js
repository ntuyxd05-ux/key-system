import crypto from "crypto";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ msg: "Method not allowed" });

  try {
    const key = crypto.randomBytes(24).toString("hex"); // 48 chars
    const ttlSeconds = 24 * 60 * 60;

    await redis.set(`key:${key}`, true, { ex: ttlSeconds });
    const expireAt = Date.now() + ttlSeconds * 1000;

    return res.status(200).json({ key, expireAt });
  } catch (e) {
    return res.status(500).json({ msg: "Internal error" });
  }
}
