// GET /.netlify/functions/export?from=YYYY-MM-DD&to=YYYY-MM-DD
import { loadData } from "./helpers.js";

export default async (req) => {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const { families, txns } = await loadData();
  const famMap = new Map(families.map(f => [f.id, f.family_name]));
  let rows = [...txns];
  if (from) rows = rows.filter(r => new Date(r.created_at) >= new Date(from));
  if (to) rows = rows.filter(r => new Date(r.created_at) <= new Date(to + "T23:59:59"));
  rows.sort((a,b)=>b.id - a.id);
  const header = "id,created_at,family_name,type,amount_dollars,note,volunteer_name\n";
  const body = rows.map(r => [
    r.id,
    r.created_at,
    JSON.stringify(famMap.get(r.family_id) || ""),
    r.type,
    (r.amount_cents/100).toFixed(2),
    JSON.stringify(r.note || ""),
    JSON.stringify(r.entered_by_name || "")
  ].join(",")).join("\n");
  return new Response(header + body, {
    headers: { "content-type": "text/csv", "cache-control": "no-cache" }
  });
};
