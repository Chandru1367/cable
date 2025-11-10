# Cable TV (MS Digital) — Local development

This repository contains a static single-page frontend (`index.html`, `app.js`, `styles.css`) and a minimal Express backend (`server.js`) used for local development/testing.

Quick start (PowerShell):

```powershell
cd "e:\Chandru\cable tv\cable tv\cable"
npm install
npm start
# Open http://localhost:3000 in your browser
```

API examples:

GET /api/status -> { ok: true, time, message }

POST /api/payments -> accepts JSON { customerId: string, amount: number, method?: string }

Notes:
- The server is intentionally minimal — payments are not persisted. Use these endpoints as an example to wire your frontend to a real backend.
- If you host frontend and backend separately, enable CORS or use relative paths when served from the same origin.
