import { createClient } from "@supabase/supabase-js";
import { createClient as createRedisClient } from "redis";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

const redis = createRedisClient({
  url: process.env.REDIS_URL,
});

await redis.connect();

export default async function handler(req, res) {
  const cache = await redis.get("koleksi");

  if (cache) {
    return res.status(200).json(JSON.parse(cache));
  }

  const { data, error } = await supabase
    .from("koleksi")
    .select("id, judul, path");

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  await redis.set("koleksi", JSON.stringify(data), { EX: 60 });

  res.status(200).json(data);
}