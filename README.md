# habit.grid 🟩

A full-stack habit tracker with GitHub-style contribution grids. Track daily habits, connect external services, and visualize your progress.

## Features

- **Contribution grid** — GitHub-style heatmap per habit (20 weeks, 4 intensity levels)
- **Habit types** — Positive habits (track goals) and quit habits (track days clean)
- **Streak tracking** — Current streak, daily count, total contributions
- **Strava integration** — Auto-sync fitness activities via OAuth 2.0 + webhooks
- **GitHub integration** — Sync your GitHub contribution history
- **Custom units** — Predefined (minutes, km, pages) or create your own
- **Authentication** — JWT-based single-user auth with httpOnly cookies
- **Date selection** — Click any grid square to log past dates

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite |
| Backend | Express, better-sqlite3 |
| Auth | JWT, bcrypt |
| Deploy | Docker Compose, GitHub Actions CI/CD |
| Database | SQLite (6 tables, auto-migrations) |

## Quick start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (for production)

### Local development

```bash
make setup       # install deps + configure git hooks
make dev         # start backend + frontend in dev mode
```

### Docker (production)

```bash
# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your secrets

# Create a user and start
make up
make create-user U=youruser P=yourpassword
```

## Environment variables

The backend requires a `.env` file in `backend/`. Copy `.env.example` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret for signing auth tokens |
| `STRAVA_CLIENT_ID` | No | From apps.strava.com |
| `STRAVA_CLIENT_SECRET` | No | From apps.strava.com |
| `STRAVA_VERIFY_TOKEN` | No | Custom token for webhook validation |
| `GITHUB_TOKEN` | No | Personal access token for GitHub sync |
| `GITHUB_USERNAME` | No | GitHub username to fetch contributions |
| `API_URL` | No | Backend URL (for OAuth callbacks) |
| `FRONTEND_URL` | No | Frontend URL (for OAuth redirects) |

## Makefile commands

```bash
make up              # start containers
make down            # stop containers
make restart         # rebuild + restart
make test            # run all tests
make test-backend    # backend tests only
make test-frontend   # frontend tests only
make logs            # tail all logs
make health          # check backend health
make seed            # populate dev data
make create-user U=x P=y  # create a user
make clean           # remove containers + images
```

## Project structure

```
habit-grid/
├── frontend/          # React + Vite SPA
│   ├── src/
│   │   ├── App.jsx            # Main UI + grid rendering
│   │   ├── components/        # Login
│   │   ├── services/          # API clients (habits, contributions, units, integrations, sync)
│   │   ├── contexts/          # AuthContext
│   │   └── constants/         # Colors, styles, defaults
│   ├── Dockerfile             # Multi-stage: build → nginx
│   └── nginx.conf
├── backend/           # Express API
│   ├── src/
│   │   ├── app.js             # Route setup
│   │   ├── db/                # SQLite connection + schema migrations
│   │   ├── routes/            # auth, habits, contributions, units, integrations, sync, webhooks, import
│   │   ├── services/          # Strava OAuth + sync, GitHub GraphQL
│   │   ├── middleware/        # JWT auth, error handler
│   │   └── scripts/           # create-user, seed
│   └── Dockerfile             # Multi-stage: native deps → runtime
├── docker-compose.yml
├── .github/workflows/deploy.yml  # CI: test → deploy → health check → auto-rollback
└── Makefile
```

## CI/CD

On push to `main`, GitHub Actions:

1. Runs backend + frontend tests (Vitest)
2. SSH deploys to VPS
3. Rebuilds Docker containers
4. Health check — auto-rollback on failure
