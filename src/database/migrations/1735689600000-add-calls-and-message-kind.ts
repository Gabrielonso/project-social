import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCallsAndMessageKind1735689600000 implements MigrationInterface {
  name = 'AddCallsAndMessageKind1735689600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "message_kind_enum" AS ENUM ('text', 'call');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      ADD COLUMN IF NOT EXISTS "kind" "message_kind_enum" NOT NULL DEFAULT 'text'
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "call_sessions_type_enum" AS ENUM ('audio', 'video');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "call_sessions_status_enum" AS ENUM (
          'ringing', 'connected', 'completed', 'missed', 'rejected', 'cancelled'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "call_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "call_uuid" text NOT NULL,
        "chat_id" uuid NOT NULL,
        "caller_id" uuid NOT NULL,
        "callee_id" uuid NOT NULL,
        "room_name" text NOT NULL,
        "type" "call_sessions_type_enum" NOT NULL,
        "status" "call_sessions_status_enum" NOT NULL,
        "initiated_at" TIMESTAMP NOT NULL,
        "answered_at" TIMESTAMP,
        "caller_joined_at" TIMESTAMP,
        "callee_joined_at" TIMESTAMP,
        "caller_left_at" TIMESTAMP,
        "callee_left_at" TIMESTAMP,
        "signaling_ended_at" TIMESTAMP,
        "ended_at" TIMESTAMP,
        "media_duration_seconds" integer,
        "duration_seconds" integer NOT NULL DEFAULT 0,
        "duration_final" boolean NOT NULL DEFAULT false,
        "finalized_at" TIMESTAMP,
        "chat_message_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_call_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_call_sessions_call_uuid" UNIQUE ("call_uuid")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_call_sessions_room_name" ON "call_sessions" ("room_name")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_call_sessions_caller_id" ON "call_sessions" ("caller_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_call_sessions_callee_id" ON "call_sessions" ("callee_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "call_sessions"`);
    await queryRunner.query(
      `ALTER TABLE "chat_messages" DROP COLUMN IF EXISTS "kind"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "message_kind_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "call_sessions_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "call_sessions_type_enum"`);
  }
}
