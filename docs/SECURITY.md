# Security model

- Authentication uses Auth.js credentials, BCrypt cost 12, JWT sessions, and
  framework CSRF protections.
- Login attempts are limited per normalized email in the application and the
  Nginx example adds an IP-based edge limit. Distributed deployments should
  replace the in-memory limiter with Redis.
- Every server action resolves the user from the signed session and verifies a
  restaurant membership. Client-supplied restaurant or user IDs are never used
  as authorization.
- Role permissions are enforced on the server and inaccessible navigation is
  hidden in the client shell.
- Zod validates mutation inputs and CSV imports. CSV file type, extension,
  size, row count, and row values are validated.
- Security headers disable framing, MIME sniffing, unnecessary browser
  capabilities, and non-application content origins.
- Money and quantity calculations use Prisma Decimal.
- Inventory-affecting purchases, sales, waste, and adjustments use database
  transactions and append ledger movements.
- Sensitive environment variables remain server-only and are validated during
  Node.js startup.

Review session invalidation, Redis rate limiting, object storage, malware
scanning, database row-level security, and centralized audit export before a
high-scale or regulated deployment.
