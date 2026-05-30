import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUsers1780144194219 implements MigrationInterface {
    name = 'CreateUsers1780144194219'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "githubId" bigint NOT NULL, "username" character varying(255) NOT NULL, "email" character varying(255), "avatarUrl" character varying(512) NOT NULL DEFAULT '', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "lastLoginAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_42148de213279d66bf94b363bf2" UNIQUE ("githubId"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
