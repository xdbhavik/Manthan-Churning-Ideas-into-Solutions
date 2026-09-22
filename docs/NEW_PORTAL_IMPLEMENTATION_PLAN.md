# New Innovation Portal — Implementation Plan

> Rebuilds ONLY the participant-facing **Innovation Portal** frontend from scratch.
> Backend is frozen. Sources of truth: Stitch design (UX/layout), backend audit
> (API contracts), old frontend (visual identity/animations).

---

## 0. Source-of-truth resolution (read first)

- **`docs/stitch-analysis/`** — the task references this folder, but it was never
  created. The Stitch analysis currently lives in **`stitch-designs/`** (25 files:
  13 screen folders with `index.html` + screenshots + `logo.svg` +
  `design-system.md`). **Authoritative Stitch source = `stitch-designs/`.**
  A backfill of `docs/stitch-analysis/` may be generated from `stitch-designs/`
  for documentation completeness, but implementation reads from `stitch-designs/`.
- **Backend authority** = `docs/backend-audit/` (API_REFERENCE, DATA_MODEL,
  FRONTEND_INTEGRATION_MAP, etc.).
- **Visual identity authority** = `frontend/innovation-portal-ui/`.

---

## 1. Final frontend architecture

**Stack** (matches existing tech; adds router + server-state lib):
- React 19 · Vite 6 · TypeScript 5.8
- **React Router v7** (new; old app used state-based nav — Stitch needs deep links)
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Framer Motion 13 (preserve old animation language)
- Axios (reuse the proven 401→refresh interceptor)
- **TanStack Query v5** for server state (see §8; swappable for zero-dep hooks)
- React Context for auth/session
- Material Symbols Outlined + IBM Plex Sans / Inter / JetBrains Mono (Google Fonts)
- npm; **dev port 3004** (old app stays on 3003); gateway default `http://localhost:8090`

**New project location**: `frontend/innovation-portal-web/` (old
`innovation-portal-ui/` untouched per rule #16).

**Scope decision (explicit)**: the new app is **participant-only** (SUBMITTER).
Evaluator/Admin/Reviewer functionality remains in the old app; the Stitch design
contains no evaluator screens, and the task scope is participant features only.

### Directory structure

```
frontend/innovation-portal-web/
├── public/                  # logo.svg, headshot.jpg (from stitch-designs)
├── src/
│   ├── app/
│   │   ├── providers/       # QueryProvider, AuthProvider, ToastProvider
│   │   ├── router.tsx       # router + RequireAuth guard
│   │   └── routes.tsx       # route defs (lazy pages)
│   ├── layouts/
│   │   ├── MarketingLayout.tsx   # public top-nav + footer
│   │   ├── AuthLayout.tsx        # standalone centered
│   │   └── AppLayout.tsx         # sidebar + topbar
│   ├── pages/               # one component per route
│   │   ├── public/  auth/  app/
│   ├── features/            # problems/ submissions/ auth/ profile/
│   ├── components/
│   │   ├── ui/              # Button, Card, Badge, Input, Select, Stepper, ...
│   │   ├── layout/          # MarketingNav, AppSidebar, AppTopbar, Footer, PageContainer
│   │   └── feedback/        # Toast, Modal, Skeleton, EmptyState, ErrorState
│   ├── services/            # apiClient.ts, authService.ts, portalService.ts
│   ├── models/              # domain models + DTO→model mappers
│   ├── hooks/               # useAuth, useProblems, useSubmissions, ...
│   ├── theme/               # design tokens (CSS vars + Tailwind theme mapping)
│   ├── animations/          # CSS keyframes + Framer variants
│   ├── assets/
│   ├── types/               # backend DTOs (mirror API_REFERENCE)
│   ├── utils/
│   ├── main.tsx  App.tsx  index.css
├── index.html  vite.config.ts  tsconfig.json  package.json  .env.example
```

**Layering** (strict, no raw HTTP in components):
`Presentation → feature hooks → services → apiClient → backend`.

---

## 2. Route hierarchy

| Route | Shell | Auth | Screen |
|---|---|---|---|
| `/` | Marketing | public | Landing |
| `/problems` | Marketing | public | Problem Explorer |
| `/problems/:problemId` | Marketing | public | Problem Detail |
| `/login` | Auth | public | Login + OTP |
| `/register` | Auth | **required** | Participant onboarding (after OTP; 404→register) |
| `/app/dashboard` | App | required | Dashboard |
| `/app/submissions` | App | required | My Submissions |
| `/app/submissions/new` | App | required | Create Submission wizard (accepts `?problemId=`) |
| `/app/submissions/:submissionId` | App | required | Submission Detail |
| `/app/profile` | App | required | Profile |

**Guard**: `<RequireAuth>` on `/app/*` and `/register`; unauthenticated →
`/login?redirect=<original>`. Post-registration 404 (`STUDENT_NOT_REGISTERED`)
routes to `/register`.

---

## 3. Page hierarchy

`LandingPage`, `ProblemExplorerPage`, `ProblemDetailPage`, `LoginPage`,
`RegisterPage`, `DashboardPage`, `MySubmissionsPage`, `CreateSubmissionPage`,
`SubmissionDetailPage`, `ProfilePage`. Each composes a layout + feature
components + data hooks.

---

## 4. Shared component hierarchy

**Layouts** (exact Stitch chrome):
- `MarketingLayout` → `MarketingNav` (logo · Problems/How it Works/About · Login ·
  Join Portal) + `Footer`.
- `AuthLayout` → centered, no chrome.
- `AppLayout` → `AppSidebar` (Dashboard, Explore Problems, My Submissions, Profile;
  Teams/Help/Settings rendered disabled — see §14) + `AppTopbar` (search ⌘K, bell†,
  avatar) + `PageContainer`.
† bell = no notifications API → disabled.

**UI primitives** (`components/ui/`): `Button` (primary/secondary/destructive/ghost,
sizes, sheen), `StatusBadge` (5 states), `Card`, `StatCard`, `Input`, `Select`,
`Textarea`, `OtpInput`, `Stepper`, `Timeline`, `Tabs`, `Pagination`, `SearchInput`
(⌘K), `FileRow`, `Avatar`, `Callout`, `Skeleton`, `Spinner`, `EmptyState`,
`ErrorState`, `Toast`, `Modal`.

**Feature components**:
- `features/problems/` — `ProblemCard`, `ProblemGrid`, `ProblemFilters`, `ProblemSearch`
- `features/submissions/` — `SubmissionCard`, `SubmissionList`, `SubmissionWizard`,
  `FileUploader`, `StatusTimeline`
- `features/auth/` — `LoginForm`, `OtpInput`, `RegisterForm`
- `features/profile/` — `ProfileView`, `TeamList`

---

## 5. Design-system structure

**Fusion rule**: **old frontend = brand** (colors, fonts, animation language);
**Stitch = geometry** (layout, component anatomy, hierarchy, density, responsive).
Where Stitch specifies a brand color, the old government palette wins to keep the
product visually identical.

**Tokens** (`theme/` + CSS vars in `index.css`):

```css
:root {
  /* Brand (old) */
  --color-saffron:#FF9933; --color-emerald:#138808; --color-ashoka-navy:#0A2540;
  --color-surface:#F7F8FC; --color-card:#FFFFFF; --color-hairline:#E5E7EB;
  --color-body:#1E293B; --color-muted:#64748B;

  /* Submission state chips (Stitch, mapped to SubmissionStatus) */
  --st-draft:#F1F5F9/#475569/#CBD5E1;      /* bg/text/border → DRAFT */
  --st-submitted:#EFF6FF/#1D4ED8/#BFDBFE;  /* SUBMITTED */
  --st-review:#FEF3C7/#B45309/#FDE68A;     /* UNDER_REVIEW */
  --st-returned:#FEF2F2/#B91C1C/#FECACA;   /* RETURNED */
  --st-accepted:#ECFDF5/#047857/#A7F3D0;   /* ACCEPTED */

  /* Geometry (Stitch) */
  --space-xs:4px; --space-sm:8px; --space-md:16px; --space-lg:24px; --space-xl:32px;
  --radius-card:12px; --radius-control:8px; --radius-badge:9999px;
  --shadow-sm/md/lg (navy-tinted, from old card-hover/elevation);

  /* Fonts (old) */
  --font-headline:'IBM Plex Sans'; --font-body:'Inter'; --font-code:'JetBrains Mono';
}
```

Tailwind v4 `@theme` maps these; no dark mode (Stitch is light-only).
Status mapping: `SubmissionStatus` enum → state chip token (single source).

---

## 6. API/service architecture

**`services/apiClient.ts`** — one axios instance:
- `baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8090'`
- request interceptor: attach `Bearer` from `sessionStorage`
- response interceptor: on `401` → single `POST /auth/refresh`, queue pending,
  retry; refresh failure → `clearTokens()` + redirect `/login`
- `getErrorMessage()`: RFC 7807 `ProblemDetail.detail` → `message` → `error` → HTTP code

**`services/authService.ts`**: `login` (POST /auth/login), `registerUser`
(POST /auth/register), `verifyOtp` (POST /auth/verify-otp), `logout`
(POST /auth/logout).

**`services/portalService.ts`**: `me` (GET /portal/me), `registerStudent`
(POST /portal/participants), `getProblems` / `getProblem` (client-side filter),
`getMySubmissions`, `createSubmission`, `getSubmission`, `updateSubmissionMeta`
(includes `commitSha`,`branch`), `submitSubmission`, `listFiles`, `uploadFile`,
`deleteFile`, `downloadFile`.

**No** evaluation/codejudge services (participant portal never calls them).

---

## 7. Authentication architecture

- `AuthProvider` (Context): `{ user, role, isAuthenticated, login, logout, bootstrap }`.
- Tokens (reuse `lib/auth` semantics): `sessionStorage` (`sih_portal_token`,
  `sih_portal_refresh`), `localStorage` (`sih_portal_user`). Tab-scoped session.
- Role from JWT (`SUBMITTER` = participant). 15-min access TTL; refresh rotates
  (serialize to avoid clobbering — handled in interceptor).
- `<RequireAuth>` guard; bootstrap on mount.

---

## 8. State management strategy

| State | Solution |
|---|---|
| Server data (problems/submissions/profile) | **TanStack Query v5** (chosen; swappable — services stay framework-agnostic). Handles cache/loading/error/refetch without boilerplate. |
| Auth/session | React Context (`AuthProvider`) |
| UI (modals/tabs/inputs) | local `useState`/`useReducer` |
| Wizard form | `react-hook-form` (per-step validation) |
| Toasts | Context (`ToastProvider`) |

If we must avoid new deps: replace TanStack Query with custom hooks
(`useQuery`-style) that return `{data, loading, error, refetch}` — the service
layer is untouched by this decision.

---

## 9. Data-model strategy

- `types/dto.ts` mirrors API_REFERENCE camelCase exactly. **Extends old `types.ts`
  to include `commitSha` and `branch` on `SubmissionMetaRequest`/`SubmissionView`
  (backend V3; old app omitted them — bug we correct).**
- `models/` domain models: `ProblemSummary`, `ProblemDetail`, `SubmissionSummary`,
  `SubmissionDetail`, `ProfileData`.
- `models/mappers.ts`: `toProblem`, `toSubmission`, `toParticipant`; derive
  `statusLabel`, `canEdit`, computed KPIs. UI binds only to models.
- Nullable fields → explicit null handling; empty arrays → `EmptyState`.

---

## 10. Animation strategy

**Preserve old identity verbatim** (from old `index.css`):
`tricolorSweep`, `meshDrift`, `softFloat`, `shimmerSweep`, `card-hover`, `btn-sheen`.
Framer page transition: `opacity 0→1, y 14→0, 0.28s, ease [0.16,1,0.3,1]`;
`staggerChildren: 0.06` for grids. `prefers-reduced-motion` disables all.

New micro-animations (only where Stitch adds them): OTP countdown tick, stepper
progress fill, toast slide, copy-to-clipboard toast. GPU-friendly (`transform`/
`opacity`), no layout thrash.

---

## 11. Asset strategy

| Asset | Path | Use |
|---|---|---|
| `logo.svg` | `stitch-designs/02-logo/logo.svg` → copy to `public/` | navs/footer |
| `headshot.jpg` | `stitch-designs/01-headshot/screenshot.jpg` → `public/` | avatar fallback |
| fonts/icons | Google Fonts (as old `index.html`) | global |
| screenshots | `stitch-designs/*/screenshot.*` | reference only, not shipped |

Landing screenshot is a 5.7KB placeholder → Landing follows `index.html`, not
screenshot.

---

## 12. Responsive strategy

Breakpoints `sm 640 / md 768 / lg 1024 / xl 1280`.
- Marketing: card grid `1 / sm:2 / lg:3`; nav → hamburger `<md`; type scales.
- Auth: single column, `max-w ~400px`.
- App: sidebar persistent `≥lg` (`w-64`); `<lg` off-canvas drawer (hamburger);
  tables → stacked cards `<md`; wizard → vertical stack on mobile.
- Gap: no mobile screenshots for App shell → sidebar-collapse is an assumption.
  Landing screenshot placeholder → HTML is authority.

---

## 13. Screen implementation order

0. Architecture + design system (tokens, apiClient, AuthProvider, Router, Layouts)
1. Landing `/`
2. Problem Explorer `/problems`
3. Problem Detail `/problems/:id`
4. Login + OTP `/login`
5. Register `/register`
6. Dashboard `/app/dashboard`
7. My Submissions `/app/submissions`
8. Create Submission `/app/submissions/new`
9. Submission Detail `/app/submissions/:id`
10. Profile `/app/profile`

Per-screen gate: layout+responsive → components+tokens → interactions → real API
→ loading/empty/error → animation → `npm run build` green.

---

## 14. Known Stitch ↔ backend mismatches

| # | Stitch feature | Backend reality | Resolution |
|---|---|---|---|
| 1 | Server search/filter/sort/pagination | `GET /portal/problems` returns full array, no params | Client-side filter/sort/paginate |
| 2 | GitHub commit fetch/validate | No endpoint; CodeJudge clones server-side | Manual `githubUrl`/`branch`/`commitSha` entry + regex hints |
| 3 | Auto-detected institution/AISHE | register = fullName/email/phone; HEI bind is UNIVERSITY-only | Institution read-only from `/portal/me`; no AISHE picker |
| 4 | Teams page | No team CRUD (only via submission create) | No Teams page; team shown in Submission Detail; sidebar disabled |
| 5 | Settings/Help | No backend, no Stitch screens | Sidebar disabled placeholder |
| 6 | Notifications bell | No notifications API | Disabled bell (tooltip) |
| 7 | Dashboard telemetry/sparklines/gauge | Only submissions+problems | KPIs computed client-side; omit sparkline/gauge |
| 8 | Score gauge/CodeJudge findings/audit | EVALUATOR-only endpoints | Timeline from status/reviewRound/timestamps; decision comment; no score |
| 9 | Profile domain/performance/matrix | Participant = identity+contact only | Identity+contact; omit metrics |
| 10 | Phone edit + SMS consent | **No `PATCH /portal/participants`** | Profile read-only; logged as backend gap |
| 11 | Leave/remove team member | No team update/delete | Team immutable |
| 12 | Withdraw/delete submission | Terminal statuses | Omit withdraw |

Genuine backend gaps → `docs/PORTAL_BACKEND_BLOCKERS.md` (created during build).

---

## 15. Quality gates

`npm run lint` (`tsc --noEmit`) + `npm run build` green; no console errors;
responsive at 375/768/1024/1440; keyboard nav + focus rings; reduced-motion
respected; no mock data in final build; old frontend untouched.
