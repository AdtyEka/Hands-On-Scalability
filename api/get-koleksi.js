import { createClient } from '@supabase/supabase-js'
import { createClient as createRedis } from 'redis'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

const redis = createRedis({
  url: process.env.REDIS_URL
})

await redis.connect()

export default async function handler(req, res) {

  const cache = await redis.get("koleksi")

  if (cache) {
    return res.status(200).json({
      source: "redis cache",
      data: JSON.parse(cache)
    })
  }

  const { data } = await supabase
    .from('koleksi')
    .select('*')

  await redis.set("koleksi", JSON.stringify(data), {
    EX: 120
  })

  res.status(200).json({
    source: "supabase",
    data
  })
}