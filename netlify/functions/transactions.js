// GET /.netlify/functions/transactions?limit=20
// POST body: { pin, family_id, type, amount, note, volunteer_name, client_request_id }
import { loadData, saveData, json, nextId, balanceForFamily } from "./helpers.js";

export default async (req) => {
  const url = new URL(req.url);
  if (req.method === "GET") {
    const limit = Math.min(Number(url.searchParams.get("limit") || 20), 200);
    const { families, txns } = await loadData();
    const famMap = new Map(families.map(f => [f.id, f.family_name]));
    const rows = [...txns]
      .sort((a,b)=>b.id - a.id)
      .slice(0, limit)
      .map(t => ({ ...t, family_name: famMap.get(t.family_id) }));
    return json(rows);
  }
  if (req.method === "POST") {
    const body = await req.json();
    const PIN = process.env.WRITE_PIN || "2028";
    if (body.pin !== PIN) return json({ error: "Unauthorized" }, 401);

    const { store, families, txns } = await loadData();
    const fam = families.find(f => f.id === Number(body.family_id));
    if (!fam) return json({ error: "Family not found" }, 404);

    if (!["credit","debit"].includes(body.type)) return json({ error:"Invalid type" }, 400);
    const amt = Number(body.amount);
    if (!Number.isFinite(amt) || amt <= 0) return json({ error:"Amount must be > 0" }, 400);
    if (body.note && (body.note.length < 2 || body.note.length > 80)) return json({ error:"Note length 2-80 chars" }, 400);

    if (body.client_request_id && txns.some(t => t.client_request_id === body.client_request_id)) {
      return json({ error: "Duplicate submission" }, 409);
    }

    const txn = {
      id: nextId(txns),
      family_id: Number(body.family_id),
      type: body.type,
      amount_cents: Math.round(amt * 100),
      note: body.note || null,
      entered_by_name: body.volunteer_name || null,
      client_request_id: body.client_request_id || crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    txns.push(txn);
    await saveData(store, families, txns);

    const bal = balanceForFamily(txns, txn.family_id);
    return json({ id: txn.id, balance_cents: bal });
  }
  return json({ error: "Method not allowed" }, 405);
};
