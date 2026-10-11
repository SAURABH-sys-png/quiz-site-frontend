# Quiz Platform Frontend

This repository contains the Vite + React frontend. It is deployed to Vercel separately from the backend Railway
service.

## Vercel

Import this repository as a Vercel project. The repository root is the project root; [vercel.json](./vercel.json)
sets the Vite build and SPA route fallback.

Set these environment variables:

| Variable | Value |
|---|---|
| `VITE_API_URL` | Backend's Railway public origin, e.g. `https://your-backend.up.railway.app` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Web client ID used by the backend |

Add the frontend's Vercel domain to the Google OAuth client's **Authorized JavaScript origins**. Redeploy after
changing environment variables.

`VITE_API_URL` must be the backend origin only: do not append `/api` or `/socket.io`. The frontend uses that
origin for both credentialed `/api/...` HTTP calls and the Socket.IO connection at `/socket.io`. Set the
backend's `CLIENT_ORIGIN` to the exact Vercel origin (scheme + hostname, no path or trailing slash).

The login cookie is `httpOnly` and is sent on the Socket.IO handshake. The Railway service must use
`COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none` for the default, separate Vercel and Railway hostnames. CORS
allowing the frontend origin is required, but it does not override browser third-party-cookie blocking. If login
does not persist or sockets report `unauthorized`, use custom frontend and API domains under the same site
(e.g. `quiz.example.com` and `api.example.com`) and set `COOKIE_SAME_SITE=lax` on the backend.

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
