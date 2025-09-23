# Cajuns Concession Stand — Netlify with Admin Upload

This build removes Neon/Postgres and provides an Admin Upload page.

## Deploy Steps
1. Upload these files to GitHub.
2. In Netlify → Import existing project → choose your repo.
3. Settings:
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
   - No build command
4. Environment variables:
   - WRITE_PIN = 2028
   - ADMIN_PIN = 2828
5. Deploy.

## Usage
Go to `/admin.html` on your live site.
Enter Admin PIN (2828).
Upload `families.json` and `transactions.json`.
Click Upload → data is stored in Netlify Blobs.
