# Uplands Backend (Node + pg)

Run locally:
1. copy `.env` with DATABASE_URL, PORT, ADMIN_KEY, RADIO_STREAM
2. npm install
3. npm run dev

Deploy:
- Push to GitHub and create Render Web Service.
- Build command: `npm install`
- Start command: `node server.js`
- Set env vars on Render: DATABASE_URL, PORT (optional), ADMIN_KEY, RADIO_STREAM