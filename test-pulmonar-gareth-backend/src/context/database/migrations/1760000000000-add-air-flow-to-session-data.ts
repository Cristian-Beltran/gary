import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAirFlowToSessionData1760000000000 implements MigrationInterface {
  name = 'AddAirFlowToSessionData1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "session_data" ADD "airFlow" double precision NOT NULL DEFAULT 0',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "session_data" DROP COLUMN "airFlow"');
  }
}
