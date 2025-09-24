// POST /.netlify/functions/admin_upload { admin_pin, families, txns }
import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "content-type":"application/json" }});
  }
  const body = await req.json().catch(()=> ({}));
  const ADMIN = process.env.ADMIN_PIN || "2828";
  if ((body.admin_pin || "").trim() !== ADMIN) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "content-type":"application/json" }});
  }
  try{
    const fam = JSON.stringify(JSON.parse(body.families || "[]"));
    const txn = JSON.stringify(JSON.parse(body.txns || "[]"));
    const store = getStore("cajuns");
    await store.set("families", fam);
    await store.set("txns", txn);
    return new Response(JSON.stringify({ ok:true }), { headers: { "content-type":"application/json" }});
  }catch(e){
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: { "content-type":"application/json" }});
  }
};
