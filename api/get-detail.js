import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export default async function handler(req, res) {

  const { id } = req.query

  const { data } = await supabase
    .from('koleksi')
    .select('*')
    .eq('id', id)
    .single()

  res.status(200).json(data)
}