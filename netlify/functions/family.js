// GET /.netlify/functions/family?id=123
import { loadData, json, balanceForFamily } from "./helpers.js";

export default async (req) => {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  if (!id) return json({ error: "Missing id" }, 400);
  const { families, txns } = await loadData();
  const fam = families.find(f => f.id === id);
  if (!fam) return json({ error: "Family not found" }, 404);
  const recent = txns.filter(t => t.family_id === id).sort((a,b)=>b.id-a.id).slice(0,10);
  const bal = balanceForFamily(txns, id);
  return json({
    id: fam.id,
    family_name: fam.family_name,
    kids_name: fam.kids_name || null,
    balance_cents: bal,
    recent_transactions: recent
  });
};
