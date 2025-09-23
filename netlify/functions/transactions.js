import { getStore } from "@netlify/blobs";

export default async (req) => {
  const body = await req.json();
  if (body.pin !== (process.env.WRITE_PIN || "2028")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const store = getStore("cajuns");
  const txns = JSON.parse((await store.get("txns")) || "[]");
  const id = txns.length ? txns[txns.length - 1].id + 1 : 1;
  const txn = { id, ...body, created_at: new Date().toISOString() };
  txns.push(txn);
  await store.set("txns", JSON.stringify(txns));

  return new Response(JSON.stringify(txn), {
    headers: { "content-type": "application/json" }
  });
};