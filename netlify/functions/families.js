// GET /.netlify/functions/families?search=
/* POST body { pin, family_name, kids_name } to create a new family */
import { loadData, saveData, json, nextId } from "./helpers.js";

export default async (req) => {
  const { store, families } = await loadData();

  if (req.method === "GET") {
    const url = new URL(req.url);
    const q = (url.searchParams.get("search") || "").trim().toLowerCase();
    const rows = families
      .filter(f => !q || f.family_name.toLowerCase().includes(q))
      .map(f => ({ id: f.id, family_name: f.family_name, kids_name: f.kids_name || null }))
      .sort((a,b)=> a.family_name.localeCompare(b.family_name));
    return json(rows);
  }

  if (req.method === "POST") {
    const body = await req.json().catch(()=> ({}));
    const WRITE = process.env.WRITE_PIN || "2028";
    if ((body.pin || "").trim() !== WRITE) return json({ error: "Unauthorized" }, 401);
    const name = (body.family_name || "").trim();
    if (!name) return json({ error: "Missing family_name" }, 400);
    const kids = (body.kids_name || "").trim();
    const id = nextId(families);
    families.push({ id, family_name: name, kids_name: kids || null });
    const { store: st, txns } = await loadData();
    await saveData(st, families, txns);
    return json({ ok:true, id });
  }

  return json({ error: "Method not allowed" }, 405);
};
