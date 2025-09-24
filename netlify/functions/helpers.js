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

// Normalize amount from any old/new schema
export function getAmountCents(t){
  if (typeof t.amount_cents === "number") return t.amount_cents;
  if (t.amount_cents && !isNaN(Number(t.amount_cents))) return Number(t.amount_cents);
  if (t.amount && !isNaN(Number(t.amount))) return Math.round(Number(t.amount) * 100);
  return 0;
}

export function balanceForFamily(txns, familyId){
  let cents = 0;
  for (const t of txns){
    if (Number(t.family_id) !== Number(familyId)) continue;
    const amt = getAmountCents(t);
    const typ = (t.type || '').toLowerCase();
    if (typ === "credit") cents += amt;
    else if (typ === "debit") cents -= amt;
  }
  return cents;
}

export function nextId(arr){
  return arr.length ? Math.max(...arr.map(x => Number(x.id) || 0)) + 1 : 1;
}
