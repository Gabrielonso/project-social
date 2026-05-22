-- Run once on existing PostgreSQL DBs where user FK columns are varchar/text.
-- Safe to re-run: skips columns that are already uuid.
--
-- IMPORTANT: Set DB_SYNCHRONIZATION=false before running this.
-- TypeORM synchronize tries to DROP/ADD columns (not ALTER TYPE), which fails
-- when rows contain NULLs. This script alters types in place instead.

-- Remove orphan rows that would block NOT NULL uuid columns during sync/migration
DELETE FROM chat_participants WHERE user_id IS NULL OR chat_id IS NULL;
DELETE FROM chat_messages WHERE sender_id IS NULL OR chat_id IS NULL;
DELETE FROM message_receipts WHERE user_id IS NULL OR message_id IS NULL;
DELETE FROM message_attachments WHERE message_id IS NULL;
DELETE FROM blocks WHERE blocker_id IS NULL OR blocked_id IS NULL;
DELETE FROM follows WHERE follower_id IS NULL OR following_id IS NULL;
DELETE FROM likes WHERE user_id IS NULL OR entity_id IS NULL;
DELETE FROM bookmarks WHERE user_id IS NULL OR entity_id IS NULL;
DELETE FROM shares WHERE user_id IS NULL OR target_id IS NULL;
DELETE FROM tags WHERE user_id IS NULL OR entity_id IS NULL;
DELETE FROM comments WHERE user_id IS NULL OR target_id IS NULL;
DELETE FROM notifications WHERE user_id IS NULL;
DELETE FROM account_activities WHERE user_id IS NULL;
DELETE FROM status_views WHERE status_id IS NULL OR viewer_id IS NULL;
DELETE FROM statuses WHERE owner_id IS NULL;

CREATE OR REPLACE FUNCTION migrate_varchar_fk_to_uuid(
  p_table text,
  p_column text
) RETURNS void AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = p_table
      AND column_name = p_column
      AND udt_name <> 'uuid'
  ) THEN
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN %I TYPE uuid USING NULLIF(trim(%I::text), '''')::uuid',
      p_table,
      p_column,
      p_column,
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT migrate_varchar_fk_to_uuid('blocks', 'blocker_id');
SELECT migrate_varchar_fk_to_uuid('blocks', 'blocked_id');
SELECT migrate_varchar_fk_to_uuid('follows', 'follower_id');
SELECT migrate_varchar_fk_to_uuid('follows', 'following_id');
SELECT migrate_varchar_fk_to_uuid('posts', 'owner_id');
SELECT migrate_varchar_fk_to_uuid('thoughts', 'owner_id');
SELECT migrate_varchar_fk_to_uuid('ads', 'owner_id');
SELECT migrate_varchar_fk_to_uuid('statuses', 'owner_id');
SELECT migrate_varchar_fk_to_uuid('likes', 'user_id');
SELECT migrate_varchar_fk_to_uuid('likes', 'entity_id');
SELECT migrate_varchar_fk_to_uuid('bookmarks', 'user_id');
SELECT migrate_varchar_fk_to_uuid('bookmarks', 'entity_id');
SELECT migrate_varchar_fk_to_uuid('shares', 'user_id');
SELECT migrate_varchar_fk_to_uuid('shares', 'target_id');
SELECT migrate_varchar_fk_to_uuid('tags', 'user_id');
SELECT migrate_varchar_fk_to_uuid('tags', 'entity_id');
SELECT migrate_varchar_fk_to_uuid('comments', 'user_id');
SELECT migrate_varchar_fk_to_uuid('comments', 'target_id');
SELECT migrate_varchar_fk_to_uuid('comments', 'parent_id');
SELECT migrate_varchar_fk_to_uuid('comments', 'reply_to_user_id');
SELECT migrate_varchar_fk_to_uuid('comments', 'reply_to_comment_id');
SELECT migrate_varchar_fk_to_uuid('comments', 'deleted_by');
SELECT migrate_varchar_fk_to_uuid('notifications', 'user_id');
SELECT migrate_varchar_fk_to_uuid('account_activities', 'user_id');
SELECT migrate_varchar_fk_to_uuid('status_views', 'status_id');
SELECT migrate_varchar_fk_to_uuid('status_views', 'viewer_id');
SELECT migrate_varchar_fk_to_uuid('chat_participants', 'user_id');
SELECT migrate_varchar_fk_to_uuid('chat_participants', 'chat_id');
SELECT migrate_varchar_fk_to_uuid('chat_participants', 'last_seen_message_id');
SELECT migrate_varchar_fk_to_uuid('chat_messages', 'chat_id');
SELECT migrate_varchar_fk_to_uuid('chat_messages', 'sender_id');
SELECT migrate_varchar_fk_to_uuid('message_receipts', 'message_id');
SELECT migrate_varchar_fk_to_uuid('message_receipts', 'user_id');
SELECT migrate_varchar_fk_to_uuid('message_attachments', 'message_id');

DROP FUNCTION migrate_varchar_fk_to_uuid(text, text);
