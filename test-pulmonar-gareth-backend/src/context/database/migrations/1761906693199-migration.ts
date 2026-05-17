import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1761906693199 implements MigrationInterface {
    name = 'Migration1761906693199'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_fd11aa87698d5a784713b9de978"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "deviceId"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sessions" ADD "deviceId" uuid`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_fd11aa87698d5a784713b9de978" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
