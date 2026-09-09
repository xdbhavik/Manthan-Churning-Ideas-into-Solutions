# Changes Made by Veer

Date: 2026-09-09

This document records the changes, fixes, checks, and local run instructions handled during this session for the SIH26043 project.

## 1. Backend and Local Runtime

### Docker Compose stack

- Started and checked the backend services from the `backend` directory.
- Verified the main services were running:
  - Eureka server
  - Source service
  - Problem service
  - Evaluation service
  - Portal service
  - Codejudge service
  - PostgreSQL/PostGIS database
  - Caddy gateway
- Confirmed the gateway is exposed publicly on `http://localhost:8090`.
- Confirmed the individual service ports remain internal or separately exposed as configured by Docker Compose.

### Gateway port correction

- Identified that the public gateway uses host port `8090`, mapped to Caddy port `8080` inside the container.
- Corrected frontend API assumptions that were pointing at the wrong port.
- Kept frontend requests on relative service paths such as:
  - `/auth`
  - `/evaluation`
  - `/portal`
  - `/source`
  - `/problems`
  - `/codejudge`
- Verified that the Caddy route groups forward requests to the appropriate backend services.

### CORS and API diagnosis

- Investigated the admin login CORS failure.
- Determined that the main cause was an incorrect backend/gateway endpoint assumption, rather than a frontend-only CORS problem.
- Standardized the expected public API entry point around the gateway at `localhost:8090`.
- Confirmed that browser clients should use the gateway instead of calling each Spring Boot service directly.

## 2. Demo Authentication Data

### Seeded development users

- Added development user seed data for the local authentication flow.
- Included demo accounts for the principal roles:
  - Admin
  - Reviewer
  - Submitter
  - Evaluator
- Used the development OTP `123456` for local testing.
- The evaluator demo phone used during testing was `9700000001`.

### Authentication flow checks

- Tested the login and OTP verification flow through the gateway.
- Verified the expected endpoints:
  - `POST /auth/login`
  - `POST /auth/verify-otp`
- Confirmed that the frontend stores and sends the returned access token.
- Checked role-based redirects for evaluator, administrator, and reviewer users.

## 3. Evaluator 404 Fix

### Root cause

- The evaluator user existed in the source-service user table and could authenticate successfully.
- The evaluator pages still returned HTTP 404 responses from endpoints such as `/evaluation/me/profile`.
- Investigation showed that the evaluation-service database did not contain a matching row in `evaluator_profile`.
- The evaluator role by itself was not enough for the evaluator dashboard. The evaluation-service also requires an evaluator profile record.

### Database migration

- Added a migration to seed the demo evaluator profile.
- The seeded profile uses:
  - User ID: `44444444-4444-4444-8444-444444444444`
  - Full name: `Demo Evaluator`
  - Evaluator type: `GOVERNMENT`
- The migration allows the authenticated demo evaluator to load:
  - `/evaluation/me/profile`
  - `/evaluation/me/criteria`
  - Assignment-related evaluator endpoints

### Service verification

- Rebuilt/restarted the evaluation service after adding the migration.
- Confirmed that the evaluator profile endpoint returned valid JSON after the profile row existed.
- Confirmed that the original 404 was caused by missing backend state, not by a missing React route.

## 4. Admin UI and Authentication Changes

### API client

- Updated the admin UI API client to use the gateway at `http://localhost:8090`.
- Preserved bearer-token attachment for authenticated API calls.
- Preserved refresh-token handling for expired sessions.
- Added or retained handling for redirecting users to login after an unrecoverable session expiration.

### Admin login and OTP screens

- Updated the admin login flow to match the working submitter authentication pattern.
- Adjusted login and OTP request handling to match the backend authentication DTOs.
- Preserved loading, error, and disabled-button states during authentication.
- Kept role checks for administrator and reviewer access.

### Admin layout and styling

- Updated the admin shell, header, sidebar, login page, and OTP page.
- Moved the visual treatment away from the earlier heavy navy presentation toward a lighter neutral palette closer to the evaluator/submitter applications.
- Updated spacing, backgrounds, borders, typography, navigation states, and form presentation.
- Preserved the existing admin routes and service boundaries.

### Admin API guide

- Added `ADMIN_UI_API_GUIDE.md` to document the admin UI API expectations and gateway usage.
- The guide records the relevant service paths and the authentication assumptions used by the admin frontend.

## 5. Evaluator UI Investigation and Rollback

### Initial evaluator UI work

- Checked the evaluator app routes, protected-route logic, authentication storage, API client, and evaluator services.
- Verified the evaluator UI had routes for:
  - Login
  - Dashboard
  - Profile
  - Assignments
  - Project reviews
  - Scoring
  - Administrator evaluation queue and onboarding pages
- Built the evaluator UI successfully with TypeScript and Vite during the investigation.

### Blank page and startup diagnosis

- Found that running `npm run dev` from the repository root fails because the root does not contain the evaluator package scripts.
- Confirmed the evaluator app must be started from:
  `frontend/evaluator-ui`
- Confirmed the evaluator Vite app normally uses port `3001`.
- When port `3001` was already occupied, Vite started on another port such as `3002`.
- Opened the running app and confirmed the login page rendered correctly when started from the actual evaluator project folder.

### Evaluator changes reverted

- At the end of the session, the requested evaluator UI changes were reverted to the state before the latest evaluator-related commit.
- The restored files included:
  - `frontend/evaluator-ui/EVALUATION_FRONTEND_REQUIREMENTS.md`
  - `frontend/evaluator-ui/package-lock.json`
  - `frontend/evaluator-ui/src/lib/api.ts`
  - `frontend/evaluator-ui/vite.config.ts`
- The restored evaluator UI was compiled again with `npm run build`.
- The build completed successfully after the rollback.
- Admin UI, submitter UI, and backend changes were intentionally left untouched during that rollback.

## 6. Verification Performed

- Checked Docker Compose service status.
- Checked the gateway port and routing assumptions.
- Tested authentication endpoints through the gateway.
- Diagnosed evaluator profile HTTP 404 responses.
- Added and verified the evaluator profile seed migration.
- Built the admin UI successfully.
- Built the evaluator UI successfully before and after the rollback.
- Started the evaluator UI from its correct project directory and confirmed the login page rendered.

## 7. Correct Local Startup Commands

### Backend

```powershell
Set-Location "backend"
docker compose up -d --build
```

The public gateway is available at:

```text
http://localhost:8090
```

### Evaluator UI

```powershell
Set-Location "frontend/evaluator-ui"
npm install
npm run dev
```

The evaluator UI is normally available at:

```text
http://localhost:3001
```

If port `3001` is occupied, Vite may select the next available port.

### Admin UI

```powershell
Set-Location "frontend/admin-ui"
npm install
npm run dev
```

### Submitter UI

```powershell
Set-Location "frontend/submitter-ui"
npm install
npm run dev
```

## 8. Important Lessons for Future Runs

- Start each frontend from its own project directory.
- Use `http://localhost:8090` as the public backend gateway URL.
- Do not assume that a valid role automatically creates an evaluator profile.
- Evaluator authentication requires both:
  - A source-service user with the `EVALUATOR` role.
  - A matching evaluation-service `evaluator_profile` row.
- When a page appears blank, check the browser console, the Vite startup directory, the active port, and the API response before changing route components.
- Do not treat a backend 404 from `/evaluation/me/profile` as a React routing error without checking evaluator profile data first.
