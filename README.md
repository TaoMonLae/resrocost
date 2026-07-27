# RestroCost

Restaurant cost, recipe pricing, inventory, sales, and profit management for
multi-branch operators.

Phases 1 and 2 establish the production foundation and supply workflow:

- Next.js App Router, React, TypeScript, and Tailwind CSS
- shadcn/ui-compatible component configuration
- PostgreSQL and Prisma with a tenant-aware schema
- Auth.js credentials authentication with BCrypt password hashing
- verified restaurant memberships and server-side role permissions
- transactional eight-step restaurant onboarding
- responsive desktop sidebar and mobile navigation drawer
- dark mode and accessible loading/error states
- a dashboard backed only by restaurant-scoped database queries
- ingredient and supplier masters with searchable detail views
- purchase capture with unit conversion and weighted-average costing
- append-only inventory movements, stock adjustments, and low-stock visibility

## Requirements

- Node.js 22 or newer
- PostgreSQL 15 or newer
- npm 11 or newer

## Local setup

1. Copy `.env.example` to `.env`.
2. Replace `AUTH_SECRET` with a random string of at least 32 characters.
3. Start PostgreSQL:

   ```bash
   docker compose up -d database
   ```

4. Install dependencies and prepare the database:

   ```bash
   npm install
   npm run db:generate
   npm run db:migrate
   ```

5. Optionally load development records:

   ```bash
   npm run db:seed
   ```

6. Start the app:

   ```bash
   npm run dev
   ```

The development seed creates `owner@restrocost.local` with password
`RestroCost123!`. The seed refuses to run when `NODE_ENV=production`.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma |
| `AUTH_SECRET` | Yes | Auth.js signing secret; minimum 32 characters |
| `AUTH_URL` | Production | Canonical authentication URL |
| `NEXT_PUBLIC_APP_URL` | Yes | Canonical application URL and metadata base |
| `UPLOAD_STORAGE_PATH` | Later phase | Local upload directory |
| `MAX_UPLOAD_SIZE` | Later phase | Maximum upload size in bytes |
| `DEFAULT_CURRENCY` | Yes | ISO 4217 fallback currency |

Never expose `DATABASE_URL` or `AUTH_SECRET` to the browser.

## Database workflow

The initial migration is in
`prisma/migrations/20260727000000_phase_1_foundation`. For a local schema
change:

```bash
npm run db:migrate
npm run db:generate
```

For a production release:

```bash
npm run db:deploy
```

The schema keeps historical purchase and sale snapshots, uses `Decimal` for
money and quantities, and includes `restaurantId` on every restaurant-owned
record. A client-supplied tenant identifier is never treated as authorization;
server code resolves the signed-in user and verifies membership first.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

`npm run phase:verify` runs all four checks in sequence.

## Phase roadmap

1. **Foundation** — complete: auth, tenants, onboarding, permissions, shell, dashboard
2. **Supply & stock** — complete: ingredients, suppliers, purchases, conversions, ledger
3. **Recipes & pricing** — recipes, sub-recipes, menu items, channels
4. **Actuals** — sales, expenses, waste, immutable profit snapshots
5. **Intelligence** — dashboard charts, reports, break-even, menu engineering
6. **Operations** — simulator, CSV workflows, hardening, docs, deployment

See [permission rules](docs/PERMISSIONS.md) and
[calculation methodology](docs/CALCULATIONS.md). The
[inventory operations guide](docs/INVENTORY.md) explains unit conversion,
costing, and correction rules.
