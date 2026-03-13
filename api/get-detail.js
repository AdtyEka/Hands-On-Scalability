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
  try {
    const { id } = req.query; // id = uuid dari tabel koleksi

    const cacheKey = `detail:${id}`;

    // Cek cache detail
    const cache = await redis.get(cacheKey);

    if (cache) {
      return res.status(200).json({
        source: "redis cache",
        data: JSON.parse(cache),
      });
    }

    // Ambil 1 baris dari Supabase
    const { data, error } = await supabase
      .from("koleksi")
      .select("id, judul, pencipta, tahun, harga, path")
      .eq("id", id)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Simpan ke Redis dengan TTL 60 detik
    await redis.set(cacheKey, JSON.stringify(data), { EX: 60 });

    return res.status(200).json({
      source: "supabase",
      data,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}