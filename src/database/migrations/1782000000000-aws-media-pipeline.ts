import { MigrationInterface, QueryRunner } from 'typeorm';

export class AwsMediaPipeline1782000000000 implements MigrationInterface {
  name = 'AwsMediaPipeline1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "moderation_status_enum" AS ENUM ('pending', 'skipped', 'passed', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "medias_upload_folder_enum" AS ENUM (
          'posts', 'ads', 'users', 'messages', 'status', 'others'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TYPE "medias_status_enum" ADD VALUE IF NOT EXISTS 'uploading';
    `);
    await queryRunner.query(`
      ALTER TYPE "medias_status_enum" ADD VALUE IF NOT EXISTS 'moderating';
    `);
    await queryRunner.query(`
      ALTER TYPE "medias_status_enum" ADD VALUE IF NOT EXISTS 'rejected';
    `);

    await queryRunner.query(`
      ALTER TABLE "medias"
      ADD COLUMN IF NOT EXISTS "owner_id" uuid,
      ADD COLUMN IF NOT EXISTS "mime_type" character varying,
      ADD COLUMN IF NOT EXISTS "moderation_status" "moderation_status_enum",
      ADD COLUMN IF NOT EXISTS "moderation_labels" jsonb,
      ADD COLUMN IF NOT EXISTS "rejection_reason" text,
      ADD COLUMN IF NOT EXISTS "moderated_at" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "variants" jsonb
    `);

    await queryRunner.query(`
      ALTER TABLE "medias"
      ADD COLUMN IF NOT EXISTS "upload_folder" "medias_upload_folder_enum"
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_medias_owner_id" ON "medias" ("owner_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_medias_owner_id"`);
    await queryRunner.query(`
      ALTER TABLE "medias"
      DROP COLUMN IF EXISTS "variants",
      DROP COLUMN IF EXISTS "moderated_at",
      DROP COLUMN IF EXISTS "rejection_reason",
      DROP COLUMN IF EXISTS "moderation_labels",
      DROP COLUMN IF EXISTS "moderation_status",
      DROP COLUMN IF EXISTS "mime_type",
      DROP COLUMN IF EXISTS "upload_folder",
      DROP COLUMN IF EXISTS "owner_id"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "medias_upload_folder_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "moderation_status_enum"`);
  }
}
