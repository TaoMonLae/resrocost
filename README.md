# RestroCost

**Restaurant Cost & Profit Manager**

RestroCost is a production-oriented, multi-tenant platform for managing
restaurant costs, inventory, recipes, menu pricing, sales, expenses, and
profitability across one or more branches.

> **Developed by Tao Mon Lae**

## Overview

RestroCost gives restaurant operators a reliable view of what every menu item
costs and earns. It connects purchasing, weighted-average inventory costing,
recipe yields, sales-channel fees, and historical sales snapshots so financial
reports remain accurate as prices change.

The interface is designed for non-technical restaurant teams, with responsive
desktop and mobile navigation, accessible forms, dark mode, clear status
indicators, and decision-focused dashboards.

## Core capabilities

### Cost and inventory control

- Ingredient and supplier management
- Standard and custom package-unit conversion
- Purchase entry with price history
- Weighted-average inventory costing
- Append-only stock ledger and manual adjustments
- Low-stock monitoring and operational alerts
- Ingredient, prepared-recipe, and menu-item waste tracking

### Recipes and menu pricing

- Versioned recipes with reusable sub-recipes
- Circular recipe dependency protection
- Batch cost, waste allowance, yield, and cost-per-serving calculations
- Full menu-item cost including packaging, labour, utilities, variable costs,
  and allocated overhead
- Food-cost and target-margin selling-price recommendations
- Separate margin, markup, and food-cost percentage reporting
- Channel-specific pricing for dine-in, takeaway, delivery, catering,
  wholesale, and custom channels

### Sales and profitability

- Manual and CSV-based sales entry
- Transaction-safe recipe stock deductions
- Immutable sale-line snapshots for price, food cost, full cost, platform
  fees, profit, and margin
- Fixed and variable expense tracking
- Revenue, cost, contribution, and profit trend charts
- Menu-item profitability and menu-engineering analysis
- Break-even revenue, units, and margin-of-safety reporting
- Non-destructive scenario simulation with saved comparisons

### Administration and operations

- Multi-restaurant and multi-branch data model
- Owner, manager, kitchen staff, accountant, and viewer roles
- Server-side authorization and tenant isolation
- Team membership and role management
- Restaurant targets, tax, currency, timezone, and stock-policy settings
- Mapped CSV imports with preview, validation, confirmation, and row-level
  results
- Permission-checked CSV exports
- Audit logging for critical operational changes
- Production configuration for Ubuntu, PostgreSQL, Nginx, PM2, and HTTPS

## Technology

| Layer | Technology |
| --- | --- |
| Application | Next.js App Router, React, TypeScript |
| Styling | Tailwind CSS, shadcn/ui-compatible components |
| Database | PostgreSQL, Prisma ORM |
| Authentication | Auth.js, BCrypt |
| Validation and forms | Zod, React Hook Form |
| Tables and charts | TanStack Table, Recharts |
| Utilities | date-fns, Lucide icons |
| Testing | Vitest, TypeScript, ESLint |

## Architecture and data integrity

Every restaurant-owned record carries a `restaurantId`. Branch-specific
records also carry a `branchId` where applicable. Server actions resolve the
active user and verified restaurant membership from the authenticated session;
tenant identifiers supplied by the browser are never trusted as authorization.

Money and quantities use Prisma `Decimal`. Purchases, sales, inventory
adjustments, and ingredient waste are written in database transactions.
Historical purchase and sale records preserve the exact conversions, prices,
costs, fees, and profit assumptions used when they were created.

## Role model

| Role | Primary access |
| --- | --- |
| `OWNER` | Full administration, team management, settings, and reports |
| `MANAGER` | Ingredients, recipes, menu items, purchases, sales, and reports |
| `KITCHEN_STAFF` | Ingredients, recipes, stock usage, and waste |
| `ACCOUNTANT` | Purchases, expenses, financial reports, and exports |
| `VIEWER` | Read-only operational and reporting access |

Permissions are enforced on the server and reflected in the application
navigation.

## Requirements

- Node.js 22 or newer
- npm 11 or newer
- PostgreSQL 15 or newer

## Getting started

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Generate a secure `AUTH_SECRET` of at least 32 characters and update `.env`.

3. Start PostgreSQL:

   ```bash
   docker compose up -d database
   ```

4. Install dependencies and prepare Prisma:

   ```bash
   npm install
   npm run db:generate
   npm run db:migrate
   ```

5. Optionally load the complete development dataset:

   ```bash
   npm run db:seed
   ```

6. Start the development server:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

### Development account

The optional development seed creates:

```text
Email:    owner@restrocost.local
Password: RestroCost123!
```

The seed refuses to run when `NODE_ENV=production`.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma |
| `AUTH_SECRET` | Yes | Auth.js signing secret with at least 32 characters |
| `AUTH_URL` | Production | Canonical authentication URL |
| `NEXT_PUBLIC_APP_URL` | Yes | Public application origin and metadata base |
| `UPLOAD_STORAGE_PATH` | When using uploads | Local attachment-storage directory |
| `MAX_UPLOAD_SIZE` | When using uploads | Maximum accepted upload size in bytes |
| `DEFAULT_CURRENCY` | Yes | ISO 4217 fallback currency code |

Never expose `DATABASE_URL`, `AUTH_SECRET`, or other server credentials to the
browser.

## Database workflow

The initial production schema migration is stored in
`prisma/migrations/20260727000000_phase_1_foundation`.

For local schema development:

```bash
npm run db:migrate
npm run db:generate
```

For production:

```bash
npm run db:deploy
```

Do not use `prisma migrate dev` or the development seed against a production
database.

## Quality checks

Run the complete quality gate:

```bash
npm run phase:verify
```

Or run each check independently:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

The completed application currently passes 31 tests across 13 test files,
along with linting, TypeScript validation, and the optimized production build.

## Deployment

Production assets are provided for:

- Ubuntu Server
- PostgreSQL
- Nginx reverse proxy and authentication rate limiting
- PM2 process management
- HTTPS with Certbot
- Prisma migration deployment
- PostgreSQL backup and recovery

Start with the [production deployment guide](docs/DEPLOYMENT.md). The included
`deploy/deploy.sh`, `deploy/nginx.conf`, and `ecosystem.config.cjs` files are
intended to be reviewed and adapted to the target infrastructure before use.

### Vercel test deployment

RestroCost can also be deployed to Vercel for testing. Connect a hosted
PostgreSQL database and configure `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`,
`NEXT_PUBLIC_APP_URL`, and `DEFAULT_CURRENCY` in the Vercel project.

The `vercel-build` script generates Prisma Client, applies checked-in
migrations, and creates the production build. New users can then register at
`/register` and continue directly into restaurant onboarding.

See the [Vercel deployment guide](docs/VERCEL.md) for the complete setup and
signup checklist.

## Documentation

- [Calculation methodology](docs/CALCULATIONS.md)
- [Roles and permissions](docs/PERMISSIONS.md)
- [Inventory operations](docs/INVENTORY.md)
- [Recipe and pricing methodology](docs/PRICING.md)
- [Sales, expenses, and waste](docs/ACTUALS.md)
- [Reports and alerts](docs/REPORTS.md)
- [CSV imports and exports](docs/CSV_IMPORTS.md)
- [Security model](docs/SECURITY.md)
- [Production deployment](docs/DEPLOYMENT.md)
- [Vercel test deployment](docs/VERCEL.md)
- [Backup and recovery](docs/BACKUP.md)

## Project status

The six planned delivery phases are complete:

1. Foundation, authentication, onboarding, permissions, and application shell
2. Ingredients, suppliers, purchases, unit conversion, and inventory ledger
3. Recipes, sub-recipes, menu items, pricing, and sales channels
4. Sales, expenses, waste, profit calculations, and historical snapshots
5. Dashboard, reports, break-even analysis, menu engineering, and alerts
6. Scenario simulation, CSV workflows, testing, security hardening,
   documentation, and deployment configuration

## License

RestroCost is available under the [MIT License](LICENSE).

---

**Developed by Tao Mon Lae**
