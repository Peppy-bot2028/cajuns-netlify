// GET /.netlify/functions/admin_download?key=families|txns&admin_pin=XXXX
import { getStore } from "@netlify/blobs";

export default async (req) => {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const admin_pin = url.searchParams.get("admin_pin");
  const ADMIN = process.env.ADMIN_PIN || "2828";
  if (admin_pin !== ADMIN) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "content-type":"application/json" }});
  }
  if (!["families","txns"].includes(key)) {
    return new Response(JSON.stringify({ error: "Invalid key" }), { status: 400, headers: { "content-type":"application/json" }});
  }
  const store = getStore("cajuns");
  const data = await store.get(key);
  return new Response(data || "[]", {
    headers: { "content-type":"application/json", "cache-control":"no-cache" }
  });
};
