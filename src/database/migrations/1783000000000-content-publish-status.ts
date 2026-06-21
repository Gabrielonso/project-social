import { MigrationInterface, QueryRunner } from 'typeorm';

export class ContentPublishStatus1783000000000 implements MigrationInterface {
  name = 'ContentPublishStatus1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "content_publish_status_enum" AS ENUM ('pending', 'published', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "posts"
      ADD COLUMN IF NOT EXISTS "publish_status" "content_publish_status_enum" NOT NULL DEFAULT 'published'
    `);

    await queryRunner.query(`
      ALTER TABLE "ads"
      ADD COLUMN IF NOT EXISTS "publish_status" "content_publish_status_enum" NOT NULL DEFAULT 'published'
    `);

    await queryRunner.query(`
      ALTER TABLE "statuses"
      ADD COLUMN IF NOT EXISTS "publish_status" "content_publish_status_enum" NOT NULL DEFAULT 'published'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "statuses" DROP COLUMN IF EXISTS "publish_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "ads" DROP COLUMN IF EXISTS "publish_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "posts" DROP COLUMN IF EXISTS "publish_status"
    `);
    await queryRunner.query(`
      DROP TYPE IF EXISTS "content_publish_status_enum"
    `);
  }
}
