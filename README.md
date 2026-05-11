# Appointments

Simple appointment-scheduling web app. Employees can view upcoming appointments and add new ones.

## Tech stack

- **Frontend**: React 18 + Vite (`frontend/`)
- **Backend**: Node.js 20 + Express (`backend/`)
- **Data**: In-memory array (hardcoded — will move to a real database)

## Local development

You need [Node.js 20+](https://nodejs.org) installed.

Run the **backend** in one terminal:

```bash
cd backend
npm install
npm run dev
```

The API will be at `http://localhost:3001`. Quick check:

```bash
curl http://localhost:3001/api/health
```

Run the **frontend** in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Environment variables

### Backend (`backend/.env`)

| Key | Local value | Production value |
|---|---|---|
| `PORT` | `3001` | Auto-set by host (Railway/Render) — leave unset |
| `ALLOWED_ORIGIN` | `http://localhost:5173` | The frontend URL, e.g. `https://appointments.vercel.app` |

### Frontend (`frontend/.env`)

| Key | Local value | Production value |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3001` | The backend URL, e.g. `https://appointments-api.up.railway.app` |

Copy `.env.example` to `.env` in each folder to get started.

## API endpoints

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/health` | — | `{ status, service }` |
| GET | `/api/appointments` | — | Array of appointments, sorted by date+time |
| GET | `/api/appointments/:id` | — | Single appointment |
| POST | `/api/appointments` | `{ title, clientName?, date, time, notes? }` | Created appointment |
| DELETE | `/api/appointments/:id` | — | Deleted appointment |

## Deployment notes

- **Frontend** → Vercel (auto-detects Vite, no config needed). Set `VITE_API_URL` in project settings.
- **Backend** → Railway or Render. Set `ALLOWED_ORIGIN` to the deployed frontend URL.
- **Database** → Currently none (data resets on backend restart). Next step: migrate to Supabase PostgreSQL.

## Known limitations

- Data is held in memory — restarting the backend loses anything you added.
- No login / authentication. Anyone with the URL can see and edit appointments.
- No timezone handling — all times are treated as local strings.
