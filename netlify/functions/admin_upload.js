// POST /.netlify/functions/admin_upload
// body: { admin_pin, families, txns }
import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "content-type":"application/json" }});
  }
  const body = await req.json().catch(()=> ({}));
  const adminPin = body.admin_pin;
  const ADMIN = process.env.ADMIN_PIN || "2828";
  if (adminPin !== ADMIN) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "content-type":"application/json" }});
  }
  const store = getStore("cajuns");

  function normalize(val){
    if (val == null) return [];
    if (typeof val === "string") {
      try { return JSON.parse(val); } catch { return []; }
    }
    if (Array.isArray(val)) return val;
    return [];
  }

  const families = normalize(body.families);
  const txns = normalize(body.txns);

  await Promise.all([
    store.set("families", JSON.stringify(families)),
    store.set("txns", JSON.stringify(txns))
  ]);

  return new Response(JSON.stringify({ ok: true, families: families.length, txns: txns.length }), {
    headers: { "content-type":"application/json" }
  });
};
