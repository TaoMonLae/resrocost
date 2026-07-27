# Backup and recovery

## PostgreSQL backup

Run from a secured backup host or as a restricted server user:

```bash
pg_dump --format=custom --no-owner --file=restrocost-$(date +%F-%H%M).dump "$DATABASE_URL"
```

Encrypt backups, store them outside the application server, and retain a mix of
daily, weekly, and monthly copies. Protect backup credentials separately from
the application environment.

## Restore test

Restore into a disposable database, never directly over production:

```bash
createdb restrocost_restore_test
pg_restore --no-owner --dbname=restrocost_restore_test restrocost-backup.dump
```

Run `npx prisma migrate status` and a read-only application smoke test against
the restored database. A backup is not considered reliable until restore tests
are performed regularly.

## Uploaded files

Back up `UPLOAD_STORAGE_PATH` independently if receipt or image storage is
enabled. Keep database and file backups from the same recovery window.

## Recovery procedure

1. Stop application writes.
2. Preserve the damaged database for investigation.
3. Create a new PostgreSQL database.
4. Restore the selected verified backup.
5. Apply any later safe migrations.
6. point `DATABASE_URL` to the restored database.
7. Validate tenant counts, recent sales, inventory balances, and audit logs.
8. Resume the application and document the recovery.
