import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function uploadVideo() {
  const filePath =
    "/Users/adtyy/Sites/Hands-On/public/koleksi/41e56465f90656db1adf92bb240aad29.mp4";

  const fileBuffer = fs.readFileSync(filePath);

  const fileName = "41e56465f90656db1adf92bb240aad29.mp4";

  const { data, error } = await supabase.storage
    .from("koleksi")
    .upload(fileName, fileBuffer, {
      contentType: "video/mp4",
      upsert: true,
    });

  if (error) {
    console.error("Upload gagal:", error);
  } else {
    console.log("Upload berhasil:", data);
  }
}

uploadVideo();