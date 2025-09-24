// GET: /.netlify/functions/family?id=123
import { loadData, json, balanceForFamily, getAmountCents } from "./helpers.js";

export default async (req) => {
  const { families, txns } = await loadData();
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  const family = families.find(f => Number(f.id) === id);
  if (!family) return json({ error: "Family not found" }, 404);

  const balance_cents = balanceForFamily(txns, id);
  const recent_transactions = txns
    .filter(t => Number(t.family_id) === id)
    .slice()
    .sort((a,b)=> new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 10)
    .map(t => ({ ...t, amount_cents: getAmountCents(t) }));

  return json({
    id: family.id,
    family_name: family.family_name,
    kids_name: family.kids_name || null,
    balance_cents,
    recent_transactions
  });
};
