# Class of 2028 Cajuns Concession Stand — Netlify Edition (Full UI)

This package contains the full front-end and serverless functions to run your concession stand app **anywhere** on Netlify.

## Deploy (no terminal needed)
1. Create a GitHub repo and upload all files from this folder.
2. In **app.netlify.com** → **Add new site** → **Import from Git** → choose your repo.
3. Build settings:
   - **Publish directory:** `public`
   - **Functions directory:** `netlify/functions`
   - No build command required.
4. Environment variables:
   - `WRITE_PIN` = `2028`
   - `ADMIN_PIN` = `2028`
5. Deploy → use your Netlify URL on any device.

## Data (persistence)
- Uses **Netlify Blobs** to store:
  - Key `families` → array of families
  - Key `txns` → array of transactions (credits/debits)
- You can manage these in **Site settings → Blobs**.

## Importing starting balances
If you’ve already created `families.json` / `transactions.json` locally,
paste their contents into the Blobs keys `families` and `txns` in Netlify to seed data.

## Endpoints (for reference)
- `GET /.netlify/functions/families?search=smith`
- `POST /.netlify/functions/families` (body: `{ pin, family_name, kids_name }`)
- `GET /.netlify/functions/family?id=123`
- `GET /.netlify/functions/transactions?limit=20`
- `POST /.netlify/functions/transactions` (body: `{ pin, family_id, type, amount, note, volunteer_name, client_request_id }`)
- `GET /.netlify/functions/export`
