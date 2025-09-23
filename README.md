# Cajuns Netlify Concession Stand App

## Deploy to Netlify
1. Upload this repo to GitHub.
2. In Netlify: Import from GitHub repo.
3. Settings:
   - Publish directory: public
   - Functions directory: netlify/functions
4. Add Environment Variables:
   - WRITE_PIN = 2028
   - ADMIN_PIN = 2028
5. Deploy.

## Data Persistence
Uses Netlify Blobs (`families` and `txns`) for storage.
