import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTokenVersionToUsers1780154785154 implements MigrationInterface {
  name = 'AddTokenVersionToUsers1780154785154';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "tokenVersion" integer NOT NULL DEFAULT '0'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "tokenVersion"`);
  }
}
