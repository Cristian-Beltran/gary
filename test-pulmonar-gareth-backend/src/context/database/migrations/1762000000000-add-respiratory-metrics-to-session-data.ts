import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRespiratoryMetricsToSessionData1762000000000
  implements MigrationInterface
{
  name = 'AddRespiratoryMetricsToSessionData1762000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "session_data" ADD "peakExpiratoryFlow" double precision NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'ALTER TABLE "session_data" ADD "respiratoryRate" double precision NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'ALTER TABLE "session_data" ADD "expiratoryVolume" double precision NOT NULL DEFAULT 0',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "session_data" DROP COLUMN "expiratoryVolume"');
    await queryRunner.query('ALTER TABLE "session_data" DROP COLUMN "respiratoryRate"');
    await queryRunner.query('ALTER TABLE "session_data" DROP COLUMN "peakExpiratoryFlow"');
  }
}
