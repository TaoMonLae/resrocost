#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${RESTROCOST_APP_DIR:-/var/www/restrocost}"
BRANCH="${RESTROCOST_BRANCH:-main}"

cd "$APP_DIR"
git fetch --prune origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build

mkdir -p .next/standalone/.next
cp -R .next/static .next/standalone/.next/static
cp -R public .next/standalone/public

pm2 startOrReload ecosystem.config.cjs --env production
pm2 save
