// GET /.netlify/functions/balances?format=json|csv
import { getStore } from "@netlify/blobs";
import { getAmountCents } from "./helpers.js";

function toCSV(rows){
  const esc = (v)=>{
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  };
  const header = ["family_id","family_name","kids_name","balance_cents","balance_dollars"];
  const lines = [header.join(",")];
  for (const r of rows){
    lines.push([r.family_id, r.family_name, r.kids_name || "", r.balance_cents, (r.balance_cents/100).toFixed(2)].map(esc).join(","));
  }
  const totalCents = rows.reduce((c,r)=> c + r.balance_cents, 0);
  lines.push("");
  lines.push(["","GRAND TOTAL","","", (totalCents/100).toFixed(2)].map(esc).join(","));
  return lines.join("\n");
}

export default async (req) => {
  const url = new URL(req.url);
  const format = (url.searchParams.get("format") || "json").toLowerCase();

  const store = getStore("cajuns");
  const [familiesRaw, txnsRaw] = await Promise.all([ store.get("families"), store.get("txns") ]);
  const families = JSON.parse(familiesRaw || "[]");
  const txns = JSON.parse(txnsRaw || "[]");

  const sums = new Map();
  for (const t of txns){
    const amt = getAmountCents(t);
    const typ = (t.type || '').toLowerCase();
    const id = Number(t.family_id);
    const prev = sums.get(id) || 0;
    if (typ === 'credit') sums.set(id, prev + amt);
    else if (typ === 'debit') sums.set(id, prev - amt);
  }

  const rows = families.map(f => ({
    family_id: f.id,
    family_name: f.family_name,
    kids_name: f.kids_name || null,
    balance_cents: sums.get(Number(f.id)) || 0
  })).sort((a,b)=> a.family_name.localeCompare(b.family_name));

  if (format === "csv"){
    const csv = toCSV(rows);
    return new Response(csv, { headers: { "content-type":"text/csv; charset=utf-8", "cache-control":"no-cache" }});
  }

  const total_cents = rows.reduce((c,r)=> c + r.balance_cents, 0);
  return new Response(JSON.stringify({ rows, total_cents }), {
    headers: { "content-type":"application/json", "cache-control":"no-cache" }
  });
};
