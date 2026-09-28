# Laundry Shop Management System

Production-oriented laundry business app: customers → orders → processing → payments → sales/expenses → reports.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · PostgreSQL (Neon) · Prisma 6 · custom HMAC cookie sessions (bcryptjs) · Vercel-ready.

## Features

- **Auth & RBAC** — Owner (full access) and Staff (orders, customers, payments). Role checks in layout, pages, and server actions. Audit log on financial actions.
- **Dashboard** — collected vs gross sales, expenses, operating estimate, ready/unpaid counts, 14-day collections chart, status breakdown, top services, payment methods, quick actions, period filter.
- **Orders** — RECEIVED → SORTING → WASHING → DRYING → FOLDING → READY_FOR_PICKUP → COMPLETED (+ ON_HOLD, CANCELLED), per-order activity log, dynamic service lines, discounts, notes, filters, pagination.
- **Customers** — profile, order/payment history, totals, outstanding balance, duplicate guard, archive.
- **Services & pricing** — per kg / per item / fixed, owner-only price edits (staff prices are locked server-side).
- **Payments** — cash/GCash/bank/card/other, partial payments, ledger, void (never delete), overpayment blocked.
- **Expenses** — 12 categories, date-range filters, category breakdown.
- **Reports** — gross/collected/outstanding/expenses/operating estimate, sales by service/method/staff, orders by status, outstanding balances, CSV export.
- **Receipts** — printable claim stub with order reference, business settings, pickup instructions (browser print → PDF).
- **Settings** — business info, currency, order number prefix, receipt text, staff accounts (create/deactivate/password reset).

## Local setup

```bash
npm install
cp .env.example .env      # fill DATABASE_URL + generate AUTH_SECRET
npx prisma migrate dev    # create schema
npm run db:seed           # demo data
npm run dev
```

Demo accounts (after seed):

| Role  | Email             | Password     |
|-------|-------------------|--------------|
| Owner | owner@laundry.ph  | password123  |
| Staff | staff@laundry.ph  | password123  |

Scripts: `npm run dev`, `npm run build`, `npm start`, `npm run lint`, `npm test`, `npm run db:seed`, `npm run db:migrate`.

## Deploy to Vercel + Neon

1. **Database (Neon)**
   - Create a project at [neon.tech](https://neon.tech) → copy the pooled connection string (Settings → Connection string).
   - Locally: put it in `.env` as `DATABASE_URL` and run `npx prisma migrate deploy && npm run db:seed` once (or use `npx prisma db push` for a quick start).

2. **GitHub**
   ```bash
   git add .
   git commit -m "feat: laundry shop management system"
   git push origin main
   ```

3. **Vercel**
   - [vercel.com/new](https://vercel.com/new) → Import the `Jorayyy/laundry` repo.
   - Framework preset: **Next.js** (auto-detected). No build overrides needed.
   - Add environment variables (Production + Preview + Development):
     - `DATABASE_URL` = Neon pooled connection string
     - `AUTH_SECRET` = long random string (`openssl rand -base64 32`)
   - Click **Deploy**.

4. **After first deploy**
   ```bash
   # run against the Neon URL from Vercel
   npx prisma migrate deploy
   npm run db:seed        # optional demo data — skip for real business use
   ```
   Or do this locally first, pointing `.env` at the Neon database, then push — migrations are committed under `prisma/migrations/`.

5. **Every push to `main`** auto-deploys. Change a env var → Redeploy in Vercel dashboard.

`.env` is gitignored. Never commit secrets; `.env.example` lists what's required.

## Architecture notes

- Server components by default; client components only for forms/dialogs/interactivity.
- Mutations are server actions (`app/actions/*`), validated with Zod, authorized with `requireUser()` / `requireOwner()`, audited via `lib/audit.ts`.
- Money math lives in `lib/calc.ts` (pure, covered by `tests/calc.test.ts`), amounts stored as `Decimal(12,2)`.
- Order numbers come from an atomic `OrderCounter` row inside the create transaction — no duplicates under concurrency.
- Payments are append-only; corrections are **voids**. `Order.paidAmount`/`paymentStatus` are updated in the same transaction as the payment.
- Route gating: `proxy.ts` checks the session cookie; real auth/role checks happen server-side per request.

## Known gaps (deliberate, MVP scope)

Inventory, pickup/delivery, notifications, employee module, logo upload, customizable statuses, Excel export (CSV only), SMS/email integrations. Architecture leaves room: all money/status logic is centralized and audited.
