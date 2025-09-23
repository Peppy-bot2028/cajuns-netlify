// GET /.netlify/functions/families?search=Q
// POST body: { pin, family_name, kids_name }
import { loadData, saveData, json, nextId } from "./helpers.js";

export default async (req) => {
  const url = new URL(req.url);
  if (req.method === "GET") {
    const q = (url.searchParams.get("search") || "").toLowerCase();
    const { families } = await loadData();
    const rows = families
      .filter(f => !q || (f.family_name||"").toLowerCase().includes(q))
      .sort((a,b) => (a.family_name||"").localeCompare(b.family_name||""))
      .slice(0,50)
      .map(f => ({ id: f.id, family_name: f.family_name, kids_name: f.kids_name }));
    return json(rows);
  }
  if (req.method === "POST") {
    const body = await req.json();
    const PIN = process.env.WRITE_PIN || "2028";
    if (body.pin !== PIN) return json({ error: "Unauthorized" }, 401);
    const name = (body.family_name||"").trim();
    const kids = (body.kids_name||"").trim();
    if (name.length < 2) return json({ error: "Invalid family_name" }, 400);

    const { store, families, txns } = await loadData();
    if (families.some(f => (f.family_name||"").trim().toLowerCase() === name.toLowerCase())) {
      return json({ error: "Family already exists" }, 409);
    }
    const fam = { id: nextId(families), family_name: name, kids_name: kids || null, created_at: new Date().toISOString() };
    families.push(fam);
    await saveData(store, families, txns);
    return json({ id: fam.id, family_name: fam.family_name, kids_name: fam.kids_name });
  }
  return json({ error: "Method not allowed" }, 405);
};
