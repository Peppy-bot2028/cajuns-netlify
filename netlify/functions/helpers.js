import { getStore } from "@netlify/blobs";

export async function loadData() {
  const store = getStore("cajuns");
  const [familiesRaw, txnsRaw] = await Promise.all([
    store.get("families"),
    store.get("txns")
  ]);
  const families = JSON.parse(familiesRaw || "[]");
  const txns = JSON.parse(txnsRaw || "[]");
  return { store, families, txns };
}

export async function saveData(store, families, txns) {
  await Promise.all([
    store.set("families", JSON.stringify(families)),
    store.set("txns", JSON.stringify(txns))
  ]);
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-cache" }
  });
}

// ✅ Missing exports added:
export function balanceForFamily(txns, familyId){
  return txns.reduce((c,t)=> t.family_id===familyId ? c + (t.type==='credit'?1:-1)*t.amount_cents : c, 0);
}

export function nextId(arr){
  return arr.length ? Math.max(...arr.map(x=>x.id || 0)) + 1 : 1;
}
