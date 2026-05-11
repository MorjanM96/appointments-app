# Appointments

A small internal appointment-scheduling web app. Sign in to view and manage upcoming appointments shared by your team.

## Tech stack

- **Frontend**: React 18 + Vite (in `frontend/`)
- **Backend**: Node.js 20 + Express (in `backend/`)
- **Database**: SQLite (file at `backend/data/app.db`, auto-created on first run)
- **Auth**: JWT tokens + bcrypt password hashing
- **Tests**: Node's built-in test runner with in-memory SQLite

The app has two operating modes:

| Mode | When | Storage |
|---|---|---|
| **Live API** | `VITE_API_URL` is set in the frontend's env | Express + SQLite backend |
| **Demo mode** | `VITE_API_URL` is empty | Browser localStorage only |

Demo mode lets the frontend deploy to a static host (like GitHub Pages) and still be fully usable without any backend — handy for previews.

## Quick start (local dev)

You need [Node.js 20+](https://nodejs.org).

**Terminal 1 — backend** (creates `backend/data/app.db` on first run and seeds the admin user):

```bash
cd backend
npm install
npm start
```

The API will listen on `http://localhost:3001`.

**Terminal 2 — frontend**:

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:3001" > .env.local
npm run dev
```

Open `http://localhost:5173` and sign in with:

- Username: `admin`
- Password: `admin123`

> ⚠️ Change these by setting `SEED_ADMIN_USERNAME`/`SEED_ADMIN_PASSWORD` in `backend/.env` **before** the first run. They are only seeded into the database if no users exist yet.

## API endpoints

All `/api/appointments/*` endpoints require an `Authorization: Bearer <token>` header.

### Auth

| Method | Path | Body | Returns |
|---|---|---|---|
| `POST` | `/api/auth/register` | `{ username, password, displayName? }` | `{ user, token }` |
| `POST` | `/api/auth/login` | `{ username, password }` | `{ user, token }` |
| `GET` | `/api/auth/me` | — | `{ user }` (requires token) |

### Appointments

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/api/appointments` | — | Array of appointments, sorted by date+time |
| `GET` | `/api/appointments/:id` | — | Single appointment |
| `POST` | `/api/appointments` | `{ title, date, time, clientName?, notes? }` | Created appointment |
| `PATCH` | `/api/appointments/:id` | Partial `{ title?, date?, time?, clientName?, notes? }` | Updated appointment |
| `DELETE` | `/api/appointments/:id` | — | Deleted appointment |

### Health

| Method | Path | Returns |
|---|---|---|
| `GET` | `/api/health` | `{ status, service }` |

## Environment variables

### Backend (`backend/.env`)

| Key | Local default | Notes |
|---|---|---|
| `PORT` | `3001` | Most cloud hosts override this |
| `ALLOWED_ORIGIN` | `http://localhost:5173` | CORS — set to deployed frontend URL in prod |
| `JWT_SECRET` | dev fallback | **Must be a long random string in production** |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `SEED_ADMIN_USERNAME` | `admin` | Only used on first DB creation |
| `SEED_ADMIN_PASSWORD` | `admin123` | Only used on first DB creation |
| `SEED_ADMIN_DISPLAY_NAME` | `Admin` | Only used on first DB creation |
| `DATABASE_PATH` | `data/app.db` | Use `:memory:` for ephemeral testing |

### Frontend (`frontend/.env.local`)

| Key | Value | Notes |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3001` | Empty/unset = demo mode (localStorage) |

Both folders ship `.env.example` files you can copy and edit.

## Tests

```bash
cd backend
npm test
```

The test suite spins up the Express app against an in-memory SQLite database and exercises every endpoint, including auth flows, validation, and ownership checks. All 14 tests should pass in under a second.

## Production builds

### Frontend

```bash
cd frontend
npm run build           # outputs static files to dist/
npm run preview         # serves the built files locally on 4173
```

The build is a fully static site — deploy `dist/` to GitHub Pages, Vercel, Netlify, Cloudflare Pages, or any static host.

### Backend

```bash
cd backend
NODE_ENV=production npm start
```

The backend is a long-running Node process. It needs a host that supports Node and persistent disk (for the SQLite file). See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for step-by-step Railway / Render / Fly.io instructions.

## Project layout

```
appointments-app/
├── backend/
│   ├── server.js               Express app entry point
│   ├── db.js                   SQLite open/migrate/seed
│   ├── middleware/auth.js      JWT verification
│   ├── routes/
│   │   ├── auth.js             register, login, /me
│   │   └── appointments.js     CRUD with auth + validation
│   ├── test/api.test.js        Integration tests (Node built-in runner)
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx             Top-level: routes login → register → app
│   │   ├── App.css
│   │   ├── api.js              fetch wrapper + demo-mode switcher
│   │   ├── storage.js          localStorage "database" for demo mode
│   │   └── pages/
│   │       ├── LoginPage.jsx
│   │       ├── RegisterPage.jsx
│   │       └── AppointmentsPage.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
├── docs/DEPLOYMENT.md          Step-by-step deployment guide
├── README.md                   You are here
└── .gitignore
```

## Limitations

- Single-tenant: all logged-in users see all appointments. There is no per-user isolation. This matches the "shared internal team calendar" use case but would need rework for a multi-tenant app.
- No password reset, no email verification, no rate limiting — appropriate for a small trusted team, not for a public sign-up form.
- No timezone handling — times are stored as local strings.
