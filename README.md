# Quiz Platform Frontend

This repository contains the Vite + React frontend. It is deployed to Vercel separately from the backend Railway
service.

## Vercel

Import this repository as a Vercel project. The repository root is the project root; [vercel.json](./vercel.json)
sets the Vite build and SPA route fallback.

Set these environment variables:

| Variable | Value |
|---|---|
| `VITE_API_URL` | Public URL of the backend Railway service, with no trailing slash |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Web client ID used by the backend |

Add the frontend's Vercel domain to the Google OAuth client's **Authorized JavaScript origins**. Redeploy after
changing environment variables.

The frontend sends credentialed HTTP and Socket.IO requests to `VITE_API_URL`. Prefer custom frontend and API
domains under the same site; browsers can block cookies between unrelated Vercel and Railway domains.

## Local development

```bash
npm install
npm run dev
npm test
npm run build
```

Leave `VITE_API_URL` unset locally to use the Vite `/api` and `/socket.io` proxies. See `.env.example` for the
frontend environment variables.
