# Production deployment

This guide targets Ubuntu 24.04, PostgreSQL 16, Nginx, PM2, and HTTPS.

## Host preparation

1. Create a non-root `restrocost` system user and `/var/www/restrocost`.
2. Install Node.js 22 LTS, PostgreSQL, Nginx, Git, and PM2.
3. Create a dedicated PostgreSQL database and least-privilege application user.
4. Clone the repository into `/var/www/restrocost`.
5. Create `.env` with production-only values and permissions `0600`.
6. Replace the hostname in `deploy/nginx.conf`, copy it into
   `/etc/nginx/sites-available/restrocost`, enable it, and validate with
   `nginx -t`.

Do not use the development seed in production.

## First release

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

The application binds to `127.0.0.1:3000`; only Nginx should be public.

## HTTPS

After DNS points at the server, use Certbot's Nginx integration:

```bash
sudo certbot --nginx -d restrocost.example.com
```

Enable automatic certificate renewal and verify it with
`certbot renew --dry-run`. Set `AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the
final HTTPS origin.

## Subsequent releases

Review `deploy/deploy.sh`, set `RESTROCOST_APP_DIR` and `RESTROCOST_BRANCH` if
needed, then execute it as the deployment user. The script uses fast-forward
Git updates, clean dependency installation, migration deployment, a production
build, and a PM2 reload.

## Migration safety

- Back up PostgreSQL before applying a release containing migrations.
- Use `prisma migrate deploy`, never `migrate dev`, in production.
- Review generated SQL for locks and destructive changes.
- Deploy expand/contract schema changes across separate releases when zero
  downtime is required.
