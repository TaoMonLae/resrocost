# Vercel test deployment

This guide prepares a test deployment with working email-and-password account
registration.

## 1. Create the project

Import the Git repository into Vercel and keep the detected framework as
Next.js. The repository contains a `vercel-build` script that:

1. Generates Prisma Client.
2. Applies checked-in PostgreSQL migrations.
3. Creates the optimized Next.js production build.

Vercel runs this script automatically when it is present in `package.json`.

## 2. Connect PostgreSQL

Provision PostgreSQL through the Vercel Marketplace or another hosted provider
such as Neon or Supabase. Add its connection string as `DATABASE_URL`.

The database user must be allowed to create and alter tables during
`prisma migrate deploy`. For shared or production environments, use a
dedicated migration credential and review migrations before deployment.

Use a separate database for preview deployments when preview data must remain
isolated from the production test environment.

## 3. Configure environment variables

Add these variables to the Vercel project:

| Variable | Example |
| --- | --- |
| `DATABASE_URL` | `postgresql://user:password@host/database?sslmode=require` |
| `AUTH_SECRET` | A random value containing at least 32 characters |
| `AUTH_URL` | `https://your-project.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | `https://your-project.vercel.app` |
| `DEFAULT_CURRENCY` | `USD` |
| `UPLOAD_STORAGE_PATH` | `/tmp/restrocost-uploads` |
| `MAX_UPLOAD_SIZE` | `5242880` |

Generate a suitable authentication secret locally:

```bash
openssl rand -base64 32
```

Apply variables to Production and Preview as appropriate, then redeploy so
they are available during migration and build.

Vercel's filesystem is ephemeral. Do not rely on `UPLOAD_STORAGE_PATH` for
persistent receipts or images; connect object storage before enabling
persistent uploads.

## 4. Verify account creation

After deployment:

1. Open `https://your-project.vercel.app/register`.
2. Enter a name, a unique email address, and a password containing at least 10
   characters, uppercase, lowercase, and a number.
3. Select **Create account**.
4. Confirm that the application signs in automatically and redirects to
   `/onboarding`.
5. Complete the restaurant and first-branch steps.
6. Sign out and confirm the same credentials work at `/login`.

Registration normalizes email addresses, hashes passwords with BCrypt, handles
duplicate-email races, rate-limits repeated attempts, and runs on Vercel's Node
runtime. Auth.js is configured to trust the forwarded Vercel host.

## Troubleshooting

### Database tables do not exist

Inspect the Vercel build log for `prisma migrate deploy`. Confirm
`DATABASE_URL` was available during the build and that its database user has
migration permissions.

### Authentication host error

Set `AUTH_URL` to the exact HTTPS deployment origin without a trailing path and
redeploy.

### Account is created but sign-in fails

Verify `AUTH_SECRET` is present in both build and runtime environments and
remains unchanged between deployments. Confirm the deployment is using the
same database during registration and login.
