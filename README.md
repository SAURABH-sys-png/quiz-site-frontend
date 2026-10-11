# Quiz Platform Frontend

This repository contains the Vite + React frontend. It is deployed to Vercel separately from the backend Railway
service.

## Vercel

Import this repository as a Vercel project. The repository root is the project root; [vercel.json](./vercel.json)
sets the Vite build, the SPA route fallback, and a rewrite that proxies `/api/*` to the Railway backend. If the
backend's Railway URL changes, update the `destination` of that rewrite.

Set these environment variables:

| Variable | Value |
|---|---|
| `VITE_API_URL` | Backend's Railway public origin, e.g. `https://your-backend.up.railway.app` (used for Socket.IO only) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Web client ID used by the backend |

Add the frontend's Vercel domain to the Google OAuth client's **Authorized JavaScript origins**. Redeploy after
changing environment variables.

HTTP API calls always go to the frontend's own origin (`/api/...`), and the `vercel.json` rewrite forwards them to
Railway. The `httpOnly` login cookie is therefore a first-party cookie on the Vercel domain, which Safari, iPhones and
private windows keep (they block cookies set by a backend on a different site). Vercel cannot proxy WebSockets, so
Socket.IO connects straight to `VITE_API_URL` (origin only, no `/api`) and authenticates with a short-lived token
from `GET /api/auth/socket-token`. Set the backend's `CLIENT_ORIGIN` to the exact Vercel origin (scheme + hostname, no
path or trailing slash), and `TRUST_PROXY=2` (Vercel's proxy and Railway's) so rate limits see client IPs.

To verify after deployment:

1. Open `https://<railway-domain>/api/health`; it should return a healthy response.
2. Load the Vercel site, sign in, and check browser DevTools **Network** for requests to the Railway host. API
   calls should succeed; the Socket.IO connection should reach `/socket.io` and remain connected.
3. During an attempt, confirm the client receives `score:update` after an answer is graded. The admin live
   dashboard should show its connection status and receive `leaderboard:update`.

## Local development

```bash
npm install
npm run dev
npm test
npm run build
```

Leave `VITE_API_URL` unset locally to use the Vite `/api` and `/socket.io` proxies. See `.env.example` for the
frontend environment variables.
