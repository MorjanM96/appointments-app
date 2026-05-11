# Deployment guide

This guide walks through publishing the app online. It covers two parts: the frontend (which is already deployable as static files) and the backend (which needs a host that runs Node.js).

For a team of 10–50 employees, this entire stack can run on the **free tier** of every service mentioned here. Expect $0–$10/month depending on choices.

---

## Architecture at a glance

```
Browser ──HTTPS──> Frontend (static)  ──HTTPS──> Backend (Node + SQLite)
                   GitHub Pages / Vercel         Railway / Render / Fly.io
                   (free)                        (free tier or ~$5/mo)
```

Three independent decisions:

1. **Where the frontend lives** — any static host. We default to GitHub Pages.
2. **Where the backend lives** — any Node host with persistent disk.
3. **Whether you want a live database** or are fine with demo mode (localStorage).

---

## Path A — "Just want to share a demo" (no backend)

Easiest. Builds the frontend with **demo mode** so visitors get a working app backed by their own browser's localStorage. No database, no backend, no monthly cost. Good for showing the app to someone before committing to hosting.

### Steps

1. Build the frontend with **no** `VITE_API_URL`:

   ```bash
   cd frontend
   npm install
   npm run build
   ```

   The `dist/` folder now contains the entire static site.

2. Deploy `dist/` to GitHub Pages. With the `gh` CLI (already authenticated in this project):

   ```bash
   # From the project root
   cd frontend
   npx gh-pages@6 -d dist -b gh-pages
   ```

   Then on GitHub, go to **Settings → Pages**, select branch `gh-pages` and folder `/ (root)`, and click **Save**.

3. Your app is live at `https://<your-username>.github.io/appointments-app/`.

> ⚠️ Demo mode caveat: every visitor sees their own data only. Use Path B if employees need a shared calendar.

---

## Path B — Full deployment (frontend + backend + database)

This gets you a real shared app where multiple users see and edit the same appointments.

### Step 1 — Pick a backend host

All three options are good. Pick one.

| Host | Free tier | Sleep behavior | Best for |
|---|---|---|---|
| **Railway** | $5 trial credit/month | Stays awake | Easiest signup, GitHub auto-deploy |
| **Render** | Yes, with sleep | Sleeps after 15 min idle (~50 sec wake) | Cheapest long-term, OK if rare use |
| **Fly.io** | Yes (small VMs) | Stays awake | Most control, geo-distributed |

The walkthrough below uses **Railway** because it has the smoothest experience for first-time users.

### Step 2 — Deploy the backend to Railway

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. Click **New Project → Deploy from GitHub repo**.
3. Authorize Railway to read your repos, pick `appointments-app`.
4. Railway scans the repo and asks which service to deploy. Select the **`backend`** folder (Root Directory = `backend`).
5. Railway detects Node.js automatically. Build command: leave default. Start command: `npm start`.
6. Open the **Variables** tab and add:

   | Key | Value |
   |---|---|
   | `JWT_SECRET` | A long random string. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
   | `JWT_EXPIRES_IN` | `7d` |
   | `ALLOWED_ORIGIN` | The frontend URL — fill this in after Step 3 |
   | `SEED_ADMIN_USERNAME` | Pick something — e.g. your name |
   | `SEED_ADMIN_PASSWORD` | A strong password |
   | `SEED_ADMIN_DISPLAY_NAME` | e.g. `Owner` |

7. Open the **Settings** tab → **Networking** → **Generate Domain**. Railway gives you a public URL like `appointments-api-production.up.railway.app`. Save it.
8. Test it: open `https://your-railway-url/api/health` in a browser. You should see `{"status":"ok","service":"appointments-api"}`.

> 💾 **About data persistence on Railway**: SQLite stores its data file inside the container. On the free trial, Railway preserves disk between deploys. If you grow past the trial, you'll either need to add a Railway volume ($1/mo) or migrate to Postgres. For 10–50 employees, the trial credit lasts forever.

### Step 3 — Deploy the frontend

#### Option 3a — Vercel (recommended)

1. Go to [vercel.com](https://vercel.com), sign in with GitHub.
2. Click **Add New → Project**, pick the `appointments-app` repo.
3. In the import screen:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite (auto-detected)
   - **Environment Variables**: add `VITE_API_URL` = your Railway URL from Step 2.7
4. Click **Deploy**. Takes ~30 sec. You'll get a URL like `appointments-app.vercel.app`.

#### Option 3b — GitHub Pages

```bash
cd frontend
echo "VITE_API_URL=https://your-railway-url" > .env.production
npm run build
npx gh-pages@6 -d dist -b gh-pages
```

Then enable Pages in **Settings → Pages → branch: gh-pages**.

### Step 4 — Wire up CORS

Go back to Railway → Variables → set `ALLOWED_ORIGIN` to the frontend URL (e.g. `https://appointments-app.vercel.app`). Railway will redeploy automatically. Without this, the frontend will get CORS errors.

### Step 5 — Test it

1. Open the frontend URL.
2. Sign in with the admin credentials you set in Step 2.6.
3. Create an appointment. Reload the page — it should still be there.
4. Open the frontend URL on a different device. Same data should appear.

If something fails, check:

- **Railway logs** (Deployments tab → click latest → View Logs)
- **Browser DevTools console** (F12 → Console) — CORS errors show up here
- **Network tab** (F12 → Network) — failed API calls and their responses

---

## Hardening for real production use

When you go from "test" to "actually used by employees":

1. **Change the seeded admin password** — it's already in env vars, but make sure it's strong.
2. **Set a strong `JWT_SECRET`** — never use the default. Rotate it if you suspect a leak (all existing tokens will be invalidated).
3. **Disable open registration** if only invited users should sign up. The simplest way: remove the `<button>Create one</button>` link in `LoginPage.jsx` and the `POST /api/auth/register` route. Add users from the database directly or build an admin invite flow.
4. **Add rate limiting** to `/api/auth/login` to slow down brute-force attacks. The `express-rate-limit` package adds this in ~5 lines.
5. **Migrate to PostgreSQL** if you outgrow SQLite. The Supabase free tier (500 MB Postgres + auto-backups) is a good first step. Code changes are localized to `db.js` — the API stays the same.
6. **Set up backups** — for SQLite, a daily copy of `data/app.db` to S3/Backblaze is enough. For Postgres, Supabase does this automatically.
7. **Add a real domain** — buy one from Namecheap/Cloudflare/Porkbun (~$10/yr), point it at your frontend host's CNAME. The hosts handle HTTPS automatically.

---

## Cost summary

| Item | Free tier | Realistic small-team cost |
|---|---|---|
| GitHub | Free for private repos | $0 |
| GitHub Pages | Free | $0 |
| Vercel (frontend) | 100 GB bandwidth/mo | $0 |
| Railway (backend) | $5 credit/mo | $0–$5/mo |
| Render (backend, alt) | Yes, sleeps | $0 (or $7/mo to skip sleep) |
| Custom domain | — | $10/year |
| Supabase Postgres (optional) | 500 MB DB | $0 |

For 10–50 employees, expect **$0–$10/month total** including a custom domain.

---

## Local testing tip

Want to mimic the deployed setup locally before paying for anything?

```bash
# Terminal 1 — backend
cd backend && npm start

# Terminal 2 — frontend production build
cd frontend && npm run build && npm run preview
```

Then open `http://localhost:4173`. This serves the production-built frontend instead of the dev server — exactly what users will get in production.
