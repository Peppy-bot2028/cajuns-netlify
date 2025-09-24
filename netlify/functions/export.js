// GET /.netlify/functions/export
import { getStore } from "@netlify/blobs";
import { getAmountCents } from "./helpers.js";

export default async () => {
  const store = getStore("cajuns");
  const [familiesRaw, txnsRaw] = await Promise.all([store.get("families"), store.get("txns")]);
  const families = JSON.parse(familiesRaw || "[]");
  const txns = JSON.parse(txnsRaw || "[]");
  const byId = new Map(families.map(f => [Number(f.id), f.family_name]));

  const header = ["id","family_id","family_name","type","amount_cents","amount_dollars","note","entered_by_name","created_at"];
  const lines = [header.join(",")];
  txns.forEach(t=>{
    const c = getAmountCents(t);
    const row = [
      t.id,
      t.family_id,
      (byId.get(Number(t.family_id)) || ""),
      (t.type || ""),
      c,
      (c/100).toFixed(2),
      (t.note || "").replace(/"/g,'""'),
      (t.entered_by_name || "").replace(/"/g,'""'),
      t.created_at || ""
    ].map(v => /[",
]/.test(String(v)) ? '"' + String(v).replace(/"/g,'""') + '"' : String(v));
    lines.push(row.join(","));
  });

  return new Response(lines.join("\n"), {
    headers: { "content-type":"text/csv; charset=utf-8", "cache-control":"no-cache" }
  });
};
