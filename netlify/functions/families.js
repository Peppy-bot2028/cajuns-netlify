import { getStore } from "@netlify/blobs";

export default async (req) => {
  const store = getStore("cajuns");
  const families = JSON.parse((await store.get("families")) || "[]");
  return new Response(JSON.stringify(families), {
    headers: { "content-type": "application/json" }
  });
};