# Cable TV (MS Digital) — Local development

This repository contains a static single-page frontend (`index.html`, `app.js`, `styles.css`) and a minimal Express backend (`server.js`) used for local development/testing.

Quick start (PowerShell):

```powershell
cd "e:\Chandru\cable tv\cable tv\cable"
npm install
npm start
# Open http://localhost:3000 in your browser
```

Make the app reachable from other devices on your LAN

1. Find the server machine IP (PowerShell):

```powershell
ipconfig
```

Look for the IPv4 address (for example 192.168.1.10). Then open the app from another device on the same network:

http://<server-ip>:3000  # e.g. http://192.168.1.10:3000

2. If you cannot connect from another device:
- Ensure Windows Firewall allows incoming connections on port 3000 (or temporarily disable the firewall to test).
- If devices are on different networks, either configure your router to port-forward 3000 to the server machine or use a tunnel (ngrok).

3. Using ngrok (no router changes):

```powershell
npm install -g ngrok
ngrok http 3000
```

ngrok will give you a public URL that tunnels to your local server. Use that URL on other devices.

Notes:
- The server listens on 0.0.0.0 so it accepts connections from any local interface. The README now explains firewall/router/ngrok steps.
- This is fine for development. For production, deploy to a cloud host (Render, Railway, DigitalOcean) and use HTTPS + auth.

API examples:

GET /api/status -> { ok: true, time, message }

POST /api/payments -> accepts JSON { customerId: string, amount: number, method?: string }

Notes:
- The server is intentionally minimal — payments are not persisted. Use these endpoints as an example to wire your frontend to a real backend.
- If you host frontend and backend separately, enable CORS or use relative paths when served from the same origin.
