import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePullRequests1780189956103 implements MigrationInterface {
    name = 'CreatePullRequests1780189956103'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."pull_requests_state_enum" AS ENUM('open', 'closed', 'merged')`);
        await queryRunner.query(`CREATE TABLE "pull_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "githubId" bigint NOT NULL, "number" integer NOT NULL, "title" character varying(500) NOT NULL, "body" text, "state" "public"."pull_requests_state_enum" NOT NULL, "authorUsername" character varying(255), "repoFullName" character varying(255) NOT NULL, "htmlUrl" character varying(512) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "mergedAt" TIMESTAMP WITH TIME ZONE, "lastSyncedAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "UQ_c3cf03f01a3e60feb84b0be5747" UNIQUE ("githubId"), CONSTRAINT "PK_e8a8aa8710c3a9650a19a9c2e7b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_pr_createdAt" ON "pull_requests" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_pr_authorUsername" ON "pull_requests" ("authorUsername") `);
        await queryRunner.query(`CREATE INDEX "IDX_pr_state" ON "pull_requests" ("state") `);
        await queryRunner.query(`CREATE INDEX "IDX_pr_repoFullName" ON "pull_requests" ("repoFullName") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_pr_repoFullName"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_pr_state"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_pr_authorUsername"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_pr_createdAt"`);
        await queryRunner.query(`DROP TABLE "pull_requests"`);
        await queryRunner.query(`DROP TYPE "public"."pull_requests_state_enum"`);
    }

}
