async function searchFamily(name) {
  const res = await fetch(`/.netlify/functions/families?search=${encodeURIComponent(name)}`);
  const data = await res.json();
  console.log(data);
}