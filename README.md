# NOVA — Living Codebase Ecosystem

A full-stack hackathon application that treats a software project as a living
ecosystem: modules are plants, bugs are weeds/pests, and dependencies are
roots. This is a **working thin vertical slice** — real auth, a real
database, real backend logic, and a garden visualization that renders from
live data (not a mockup) — built as the foundation for the full NOVA
concept described in the hackathon brief.

## What works

- **Auth**: sign up / log in with bcrypt-hashed passwords + JWTs, protected routes
- **Database**: Prisma schema with User, Project, ProjectMember, Module,
  ModuleDependency, Issue, IssueHistory — real foreign keys, real relations
- **Bug intelligence**: Bug DNA, Impact Radius, Root Cause Explorer, deterministic What-If simulation, lifecycle evolution, Codebase Memory, developer recommendation, prevention workflow, and bug autopsies all operate on stored project data.
- **Risk logic**: `riskAssessmentService.ts` computes each module's health
  score directly from its live open issues (severity-weighted). No hardcoded
  numbers anywhere.
- **The garden**: `GardenCanvas.tsx` renders an SVG ecosystem — plant height,
  color, leaf count, weed count, and root illumination are *all* derived from
  the health scores the backend actually calculated. Click a plant to see the
  real reasons behind its score.
- **Issue CRUD**: create/list/update issues with automatic history tracking
- **Product health**: live project health, analytics, risk, seasons and stored user notifications.
- **Demo data**: NOVA is seeded with six connected modules, eight developers, 24+ issues, histories, comments, issue relations, developer profiles and notifications. Bug #421 ("Checkout timeout after payment") is the end-to-end demo path.

- **Scroll-driven landing page** (`/`): a single pinned GSAP `ScrollTrigger`
  timeline drives one continuous SVG stage through all 14 story beats from
  the brief — healthy garden → weeds spread → AI scan → impact radius roots
  illuminate → camera drops underground for root cause → bug DNA network →
  what-if propagation ghosts → developer tag → autopsy card → memory echo →
  garden seasons tint cycle → risk pulse → resolution/recovery → morph into
  the actual dashboard UI. Scroll position *is* timeline position (`scrub`),
  so it's driven by real scroll, not sequential fade-ins. Respects
  `prefers-reduced-motion` with a genuinely different static, unpinned
  fallback (no motion at all, not just "faster").

## Transparent intelligence

No API key is required. The analysis services use deterministic, explainable local signals: title/description keyword overlap, shared module work, issue history, active severity, resolution history, dependency traversal, developer workload, and graph centrality. Risk and What-If responses are explicitly labelled as projections, not guarantees. `AI_API_KEY` remains server-only and optional for a later AI-assisted adapter.

## Architecture

```
nova-garden/
├── backend/                 Express + TypeScript + Prisma API
│   ├── prisma/
│   │   ├── schema.prisma    Database schema
│   │   └── seed.ts          Demo data
│   └── src/
│       ├── controllers/     Request handling
│       ├── routes/          Route definitions
│       ├── services/        Business logic (auth, risk, garden, issues)
│       ├── middleware/      Auth + error handling
│       ├── validators/      Zod request schemas
│       ├── utils/           JWT + Prisma client
│       ├── app.ts
│       └── server.ts
├── frontend/                 Vite + React + TypeScript
│   └── src/
│       ├── api/              Typed API clients (authApi, gardenApi, issueApi)
│       ├── garden/           GardenCanvas (SVG) + gardenLogic (data → visuals)
│       ├── pages/             LoginPage, GardenPage
│       ├── components/        ProtectedRoute
│       ├── pages/             GardenPage, IssueDetailPage, LoginPage
│       └── styles/            Design tokens (botanical palette)
└── package.json               Convenience scripts
```

## Prerequisites

- Node.js 18+
- npm

## Installation

```bash
npm run install:all
```

## Environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

`backend/.env` uses SQLite by default (`DATABASE_URL="file:./dev.db"`) so it
runs with zero external services. To use Postgres instead: change
`provider = "sqlite"` to `provider = "postgresql"` in
`backend/prisma/schema.prisma` and point `DATABASE_URL` at your Postgres
instance — no other code changes needed.

Set `AUTH_SECRET` in `backend/.env` to any long random string.

## Database setup

```bash
npm run db:setup
```

This runs, in order: `prisma generate` (builds the typed client),
`prisma migrate dev` (creates the schema), and the seed script (creates the
NOVA demo project, users, modules, dependencies, and demo issues).

> **Note on this delivery**: I built and type-checked this entire slice, and
> ran a full production build of the frontend, in my sandboxed dev
> environment. I could *not* run `prisma generate`/`migrate` there because
> that sandbox's network allowlist blocks `binaries.prisma.sh` (Prisma's
> engine download host) — a constraint of my environment, not your machine.
> It will run normally for you with standard internet access.

## Running

Two terminals:

```bash
npm run dev:backend    # http://localhost:4000
npm run dev:frontend   # http://localhost:5173
```

Visit `http://localhost:5173` for the scroll-driven landing page, or go
straight to `/login` and log in with a seeded account to reach the live
garden.

## Demo credentials

| Email | Password | Role |
|---|---|---|
| aarav@nova.dev | password123 | OWNER |
| priya@nova.dev | password123 | DEVELOPER |

## API overview

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | — | Create account, returns JWT |
| POST | `/api/auth/login` | — | Log in, returns JWT |
| GET | `/api/auth/me` | ✓ | Current user + project memberships |
| GET | `/api/projects/:projectId/garden` | ✓ | Live ecosystem view: module health + dependency graph |
| GET | `/api/projects/:projectId/issues` | ✓ | List issues |
| POST | `/api/projects/:projectId/issues` | ✓ | Create issue |
| GET | `/api/projects/:projectId/issues/:issueId` | ✓ | Issue detail + history |
| PATCH | `/api/projects/:projectId/issues/:issueId` | ✓ | Update issue (writes history rows) |

## How the health score works (no magic numbers)

`backend/src/services/riskAssessmentService.ts` takes a module's actual
`OPEN`/`IN_PROGRESS` issues and subtracts severity-weighted penalties from a
baseline of 100 (CRITICAL −25, HIGH −12, MEDIUM −5, LOW −2), then classifies
the result into THRIVING / STRESSED / WITHERING / CRITICAL. The frontend
(`frontend/src/garden/gardenLogic.ts`) is a pure function that maps that
score to plant height, leaf count, color, and weed count — it never invents
its own numbers.

## Main API additions

Authenticated, project-member routes are under `/api/projects/:projectId`:

- `GET issues/:issueId/dna`, `impact`, `root-cause`, `evolution`, `memory`, `recommendation`
- `POST issues/:issueId/simulations`, `autopsy`, `comments`
- `GET issues/:issueId/preventions`, `POST issues/:issueId/preventions/:preventionId/complete`
- `GET risk`, `season`, `health`, `analytics`, `notifications`; `PATCH notifications/:notificationId/read`

Open the garden, select an issue from **Active ecosystem issues**, then work through the detail page. Resolve it, run its autopsy, complete prevention actions, and refresh the garden to see the ecosystem recover.
