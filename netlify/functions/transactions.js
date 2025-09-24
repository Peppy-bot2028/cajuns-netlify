// GET: /.netlify/functions/transactions?limit=20
// POST: body { pin, family_id, type: 'credit'|'debit', amount, note, volunteer_name, client_request_id }
import { loadData, saveData, json, nextId, balanceForFamily, getAmountCents } from "./helpers.js";

export default async (req) => {
  const { store, families, txns } = await loadData();

  if (req.method === "GET") {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") || 20);
    const rows = txns
      .slice()
      .sort((a,b)=> new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, limit)
      .map(t => ({
        ...t,
        amount_cents: getAmountCents(t)
      }));
    // Join family name for feed
    const byId = new Map(families.map(f => [f.id, f]));
    const joined = rows.map(t => ({
      ...t,
      family_name: (byId.get(t.family_id) || {}).family_name || 'Unknown'
    }));
    return json(joined);
  }

  if (req.method === "POST") {
    const body = await req.json().catch(()=> ({}));
    const WRITE = process.env.WRITE_PIN || "2028";
    if ((body.pin || "").trim() !== WRITE) {
      return json({ error: "Unauthorized" }, 401);
    }
    const family_id = Number(body.family_id);
    const family = families.find(f => Number(f.id) === family_id);
    if (!family) return json({ error: "Family not found" }, 404);

    const kind = (body.type || "").toLowerCase();
    if (!["credit","debit"].includes(kind)) return json({ error: "Invalid type" }, 400);

    const amtFloat = Number(body.amount);
    if (!amtFloat || amtFloat <= 0) return json({ error: "Invalid amount" }, 400);
    const amount_cents = Math.round(amtFloat * 100);

    const txn = {
      id: nextId(txns),
      family_id,
      type: kind,
      amount_cents,
      note: body.note || null,
      entered_by_name: body.volunteer_name || null,
      client_request_id: body.client_request_id || null,
      created_at: new Date().toISOString()
    };

    txns.push(txn);
    await saveData(store, families, txns);

    const balance_cents = balanceForFamily(txns, family_id);
    return json({ ok: true, balance_cents, txn });
  }

  return json({ error: "Method not allowed" }, 405);
};
