# Database migrations

## UUID FK migration (`001-user-fk-columns-to-uuid.sql`)

Entity columns were updated to `type: 'uuid'`. **Do not rely on TypeORM `synchronize` for this change** — it may try to drop and re-add columns, which fails when existing rows have `NULL` values (e.g. `chat_participants.user_id`).

### Steps

1. In `.env`, set:
   ```env
   DB_SYNCHRONIZATION=false
   ```

2. Run the migration:
   ```bash
   psql -h "$DB_HOST" -U "$DB_USERNAME" -d "$DB_NAME" -f src/database/migrations/001-user-fk-columns-to-uuid.sql
   ```

3. Restart the app.

### If the app still fails to start

Clean orphans only (safe for dev), then re-run step 2:

```sql
DELETE FROM chat_participants WHERE user_id IS NULL OR chat_id IS NULL;
```

### Why `synchronize` failed

TypeORM issued:

```sql
ALTER TABLE "chat_participants" ADD "user_id" uuid NOT NULL
```

That adds a **new** column and requires every row to have a value. Your table already had `user_id` (as `varchar`) with **NULL** rows, so PostgreSQL rejected the `NOT NULL` constraint (`code: 23502`).

The SQL migration uses `ALTER COLUMN ... TYPE uuid USING ...` instead, which preserves data and only changes the type.
