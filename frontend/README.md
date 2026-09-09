# Frontend Docker Setup

This folder contains three independent frontend applications, each dockerized individually.

## Applications

| App | Port | Description |
|-----|------|-------------|
| `admin-ui` | 3000 | Admin dashboard |
| `evaluator-ui` | 3001 | Evaluator interface |
| `submitter-ui` | 3002 | Submitter interface |

## Quick Start (All Three)

From the **project root** (where `docker-compose.yml` is):

```bash
# Build and start all frontends
docker-compose up --build

# Run in background
docker-compose up -d --build

# Stop all
docker-compose down
```

Access at:
- Admin UI: http://localhost:3000
- Evaluator UI: http://localhost:3001
- Submitter UI: http://localhost:3002

## Individual Build & Run

From each app's folder:

```bash
# Admin UI
cd frontend/admin-ui
docker build -t admin-ui .
docker run -p 3000:80 admin-ui

# Evaluator UI
cd frontend/evaluator-ui
docker build -t evaluator-ui .
docker run -p 3001:80 evaluator-ui

# Submitter UI
cd frontend/submitter-ui
docker build -t submitter-ui .
docker run -p 3002:80 submitter-ui
```

## Development (Hot Reload)

For development with hot reload, use the local dev servers instead:

```bash
# Admin UI
cd frontend/admin-ui
npm install
npm run dev

# Evaluator UI
cd frontend/evaluator-ui
npm install
npm run dev

# Submitter UI
cd frontend/submitter-ui
npm install
npm run dev
```

## Architecture

Each Dockerfile uses a multi-stage build:
1. **Builder stage** (`node:20-alpine`) - installs deps, runs `npm run build`
2. **Production stage** (`nginx:alpine`) - serves static files from `/dist` with SPA routing

## Environment Variables

Create `.env` files in each app folder if needed (see `.env.example` in evaluator-ui).

The nginx config proxies API calls to the backend. Update `vite.config.ts` proxy settings or nginx config if backend URLs change.