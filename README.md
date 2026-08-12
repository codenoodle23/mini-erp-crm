# Mini ERP + CRM Operations Portal

A small internal ERP/CRM for a wholesale/distribution company: customers, products & inventory,
and a sales challan flow with real stock-deduction business logic. Built for the Full Stack
Developer case study.

**Stack:** Node.js + TypeScript + Express, PostgreSQL via Drizzle ORM, React + TypeScript (Vite),
JWT auth with 4 roles (Admin, Sales, Warehouse, Accounts).

---

## Contents

- [Quick start (local)](#quick-start-local)
- [Quick start (Docker)](#quick-start-docker)
- [Test credentials](#test-credentials)
- [Environment variables](#environment-variables)
- [Architecture](#architecture)
- [API overview](#api-overview)
- [Deployment](#deployment)
- [Assumptions made](#assumptions-made)
- [Known limitations / incomplete parts](#known-limitations--incomplete-parts)
- [A note on tooling swaps made during the build](#a-note-on-tooling-swaps-made-during-the-build)

---

## Quick start (local)

Requires Node.js 20+ and a PostgreSQL 14+ instance (local install, or Docker — see below).

### 1. Database

Create an empty Postgres database, e.g.:

```bash
createdb mini_erp_crm
# or, from psql:
# CREATE DATABASE mini_erp_crm;
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# edit .env if your DATABASE_URL differs from the default

npm install
npm run db:migrate   # creates all tables
npm run db:seed      # creates 4 demo users + sample customers/products
npm run dev           # starts the API on http://localhost:4000
```

Verify it's up: `curl http://localhost:4000/health` → `{"status":"ok"}`

### 3. Frontend

In a second terminal:

```bash
cd frontend
cp .env.example .env
# VITE_API_URL should point at the backend, default http://localhost:4000/api

npm install
npm run dev   # starts on http://localhost:5173
```

Open `http://localhost:5173` and sign in with any of the [test credentials](#test-credentials)
below — the login page has one-click buttons that fill each demo email in for you.

---

## Quick start (Docker)

From the repo root:

```bash
docker compose up --build
```

This starts Postgres, the backend API (`:4000`), and the frontend served via nginx (`:5173`).

The backend container does **not** run migrations automatically (they need `drizzle-kit`, a dev
dependency, which is intentionally left out of the slim production image). Run them once from
your host machine, pointed at the containerized Postgres:

```bash
cd backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mini_erp_crm?schema=public" npm run db:migrate
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mini_erp_crm?schema=public" npm run db:seed
```

Then open `http://localhost:5173`.

---

## Test credentials

All demo accounts share the same password: **`Password123!`**

| Role | Email |
|---|---|
| Admin | `admin@demo.com` |
| Sales | `sales@demo.com` |
| Warehouse | `warehouse@demo.com` |
| Accounts | `accounts@demo.com` |

Created by `backend/src/db/seed.ts`, along with 2 sample customers, 3 sample products, and their
opening stock movements.

---

## Environment variables

### Backend (`backend/.env`, see `backend/.env.example`)

| Variable | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | `postgresql://postgres:postgres@localhost:5432/mini_erp_crm?schema=public` |
| `JWT_SECRET` | Signing secret for auth tokens | any long random string |
| `JWT_EXPIRES_IN` | Token lifetime | `8h` |
| `PORT` | API port | `4000` |
| `NODE_ENV` | `development` / `production` | |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma-separated | `http://localhost:5173` |

### Frontend (`frontend/.env`, see `frontend/.env.example`)

| Variable | Purpose | Example |
|---|---|---|
| `VITE_API_URL` | Base URL of the backend API, **including** `/api` | `http://localhost:4000/api` |

---

## Architecture

```
mini-erp-crm/
├── backend/                  Express + TypeScript API
│   ├── src/
│   │   ├── db/                Drizzle schema, db client, seed script
│   │   ├── modules/
│   │   │   ├── auth/           login, /auth/me, admin user creation
│   │   │   ├── customers/      CRM: CRUD, search, follow-ups
│   │   │   ├── products/       inventory CRUD, stock movement log
│   │   │   └── challans/       sales challans: draft/confirm/cancel
│   │   ├── middleware/        auth guard, role guard, zod validation, error handler
│   │   ├── utils/              ApiError, asyncHandler, pagination, challan numbering
│   │   ├── app.ts / index.ts   Express app wiring, server bootstrap
│   ├── drizzle/                generated SQL migrations
│   └── drizzle.config.ts
│
├── frontend/                  React + TypeScript (Vite) SPA
│   └── src/
│       ├── api/                 typed fetch client + resource functions
│       ├── context/             AuthContext (JWT stored in localStorage)
│       ├── components/          Layout/sidebar, pills, pagination, route guard
│       ├── pages/                login, dashboard, customers, products, challans
│       └── styles/global.css     design tokens + component styles
│
├── postman/                    Postman collection covering every endpoint
├── docker-compose.yml           postgres + backend + frontend
└── .github/workflows/ci.yml     typecheck + build + docker build on push
```

Each module follows the same three-file pattern: `*.schema.ts` (Zod input validation),
`*.service.ts` (business logic + DB access), `*.routes.ts` (Express routes wiring auth/role
guards to the service). Every route goes through `asyncHandler` so thrown errors land in one
central `errorHandler` middleware, which maps `ApiError`s and raw Postgres errors (unique/FK/
not-null violations) to consistent JSON error responses and HTTP status codes.

### The core business rule: sales challans and stock

This was the part of the spec with real logic to get right, so a quick summary of how it works
(`backend/src/modules/challans/challans.service.ts`):

- A challan can be created as **DRAFT** or **CONFIRMED**. Draft challans have **no stock impact**.
- **Confirming** a challan (via `POST /challans/:id/confirm`, or by creating one directly with
  `status: "CONFIRMED"`) is what deducts stock — and it's done inside a single DB transaction that
  re-checks every line's current stock immediately before decrementing it. If any line doesn't
  have enough stock, the whole confirm is rejected with a `400` and a specific message
  (`Insufficient stock for "X": available N, requested M`) — nothing is partially applied.
- Each line item stores a **snapshot** of the product's name, SKU, and unit price at the moment
  the challan was created, in addition to the `productId` foreign key. Editing or repricing the
  product later doesn't change what a historical challan shows.
- **Cancelling** a challan that was confirmed restores the stock it had deducted (with its own
  audit-trail `StockMovement` rows), so the inventory ledger always reconciles.
- Every stock change — from a challan, a manual warehouse adjustment, or a cancellation reversal —
  is written to `stock_movements`, so `currentStock` on a product is always derivable from (and
  cross-checked against) its movement history.

### Roles

`ADMIN` can do everything. The other three roles are scoped to what the case study's business
context implies they'd do day-to-day:

| Action | Sales | Warehouse | Accounts |
|---|:---:|:---:|:---:|
| Manage customers / follow-ups | ✅ | – | – |
| Create/edit products | – | ✅ | – |
| Record stock movements | – | ✅ | – |
| Create / edit draft challans | ✅ | – | – |
| Confirm / cancel challans | ✅ | ✅ | – |
| Read everything (customers, products, challans) | ✅ | ✅ | ✅ |

Accounts currently has read-only access across the board — there's no invoicing/accounts module
in this MVP (see [Known limitations](#known-limitations--incomplete-parts)).

---

## API overview

Full request/response examples for every endpoint are in
[`postman/Mini-ERP-CRM.postman_collection.json`](postman/Mini-ERP-CRM.postman_collection.json) —
import it into Postman, run **Auth → Login (Sales)** first (it saves the JWT into a collection
variable automatically), then run anything else in any order.

All endpoints below except `POST /auth/login` require `Authorization: Bearer <token>`.

```
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/users                     (admin only)

GET    /api/customers            ?search=&status=&customerType=&page=&pageSize=
GET    /api/customers/:id
POST   /api/customers
PUT    /api/customers/:id
POST   /api/customers/:id/follow-ups

GET    /api/products             ?search=&category=&lowStock=&page=&pageSize=
GET    /api/products/:id
POST   /api/products
PUT    /api/products/:id
POST   /api/products/:id/stock-movements

GET    /api/challans             ?status=&customerId=&page=&pageSize=
GET    /api/challans/:id
GET    /api/challans/:id/pdf     authenticated PDF download
POST   /api/challans             { customerId, items: [{productId, quantity}], status }
PUT    /api/challans/:id         (DRAFT only — replaces line items)
POST   /api/challans/:id/confirm
POST   /api/challans/:id/cancel

GET    /health                    (unauthenticated)
```

All list endpoints are paginated (`{ data, pagination: { page, pageSize, total, totalPages } }`)
and validate every input with Zod, returning `400` with a `details` array of `{ path, message }`
on validation failure. Not-found records return `404`; role violations return `403`; missing/bad
tokens return `401`; unique-constraint clashes (duplicate email or SKU) return `409`.

---

## Deployment

This wasn't deployed to a live URL for this submission — see the note in
[Known limitations](#known-limitations--incomplete-parts) — but here's exactly how to do it on
the free tiers the brief lists as acceptable:

### Database — Neon / Supabase / Render Postgres
1. Create a free Postgres instance, copy its connection string.
2. Run migrations against it once from your machine: `DATABASE_URL="<that string>" npm run db:migrate` (from `backend/`).
3. Run the seed script the same way if you want demo data: `npm run db:seed`.

### Backend — Render / Railway / Fly.io
1. New Web Service, point it at `backend/` as the root/build context (or use `backend/Dockerfile` directly).
2. Build command: `npm install && npm run build`. Start command: `npm start`.
3. Environment variables: `DATABASE_URL` (from above), `JWT_SECRET` (long random string),
   `JWT_EXPIRES_IN=8h`, `NODE_ENV=production`, `CORS_ORIGIN=<your frontend's deployed URL>`.
4. Note the deployed API URL — you'll need it for the frontend.

### Frontend — Vercel / Netlify / Render Static Site
1. New static site, root `frontend/`, build command `npm run build`, output directory `dist`.
2. Environment variable: `VITE_API_URL=<your backend URL>/api`.
3. Add a SPA rewrite rule (`/* → /index.html`) so client-side routes don't 404 on refresh —
   `frontend/nginx.conf` shows the equivalent config if you're self-hosting instead.

### CI
`.github/workflows/ci.yml` typechecks and builds both apps and builds both Docker images on every
push/PR to `main`. It intentionally stops short of an actual deploy step, since that needs
provider secrets (e.g. a Render deploy hook URL) that only exist once you've created the services
above — the workflow file has a comment showing exactly what to add.

---

## Assumptions made

- **"Accounts" role** isn't given a dedicated module in the brief beyond being listed as a role —
  I scoped it to read-only access across customers/products/challans, since invoicing/ledger
  features weren't in the required modules list.
- **Follow-up notes** are modeled as an append-only log (`customer_follow_ups`) separate from the
  single `Customer.notes` field and `Customer.followUpDate`, since the brief lists "Add follow-up
  notes" as a repeatable action, not a single field to overwrite. Adding a note with a date also
  updates the customer's headline `followUpDate`, so list/detail views show the next upcoming
  follow-up without joining the log.
- **Challan numbering** is `CH-YYYYMMDD-000N`, sequential per day, generated inside the same
  transaction that creates the challan.
- **Editing challans** is only allowed while a challan is `DRAFT` (replaces all line items in one
  call); `CONFIRMED`/`CANCELLED` challans are immutable, which matches "Save challan as Draft or
  Confirmed" reading as a one-way state transition once confirmed.
- **Confirming a `WAREHOUSE`-role challan action**: I allowed both Sales and Warehouse to confirm/
  cancel challans (Sales originates the sale; Warehouse is often the one who actually completes
  the pick and confirms dispatch in wholesale operations) — Admin can always do both, of course.
- **GST number** and a few other CRM fields are optional per the brief's "GST number, optional"
  note; email is optional on both customers and users isn't (login needs it).

---

## Known limitations / incomplete parts

Being upfront about what's not here, given the 48-hour scope:

- **Not deployed to a live URL.** Everything above is built, builds cleanly, and was verified
  running (backend smoke-tested end-to-end against a live Postgres instance including the actual
  stock-deduction/negative-stock-guard logic; frontend `tsc -b && vite build` passes clean) — but
  actually standing up hosted instances on Render/Vercel/Neon wasn't done for this submission.
  Follow the [Deployment](#deployment) section to do it in a few minutes.
- **No automated test suite.** Given the time budget, correctness was verified via a real
  end-to-end smoke test against the live API (documented in the PR/commit history) plus the
  Postman collection, rather than Jest/Vitest suites. This is the biggest gap for a production
  system and the first thing I'd add next.
- **No file/image upload** (e.g. product images to S3) — listed as a bonus, not implemented.
- **Search is `ILIKE`-based**, not full-text-indexed — fine at this data volume, would want a
  trigram or full-text index before this scaled to a large customer/product catalog.
- **Challan number sequencing** counts same-day challans inside the transaction rather than using
  a dedicated Postgres sequence; correct under normal load, but a Postgres `SEQUENCE` would be a
  more robust choice under heavy concurrent write load.
- **No refresh tokens** — JWTs simply expire after 8h and the user has to log in again; there's no
  rotation/refresh flow.

---

## A note on tooling swaps made during the build

Worth documenting since it affects `package.json`: the ORM originally planned was Prisma, but its
`prisma generate` step downloads native query-engine binaries from `binaries.prisma.sh` at install
time, which wasn't reachable in the environment this was built in. Rather than ship something
unverified, the ORM was switched to **Drizzle** (pure TypeScript, no native binary download,
same PostgreSQL underneath) and the schema/services were rewritten against it — this is reflected
in `backend/src/db/schema.ts` and the `db:*` npm scripts (`drizzle-kit generate/migrate/push/studio`
instead of `prisma migrate`/`prisma studio`). Everything in this README reflects the Drizzle setup
that's actually in the repo.
