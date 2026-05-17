import { DataSource } from 'typeorm';
import * as path from 'path';

export default new DataSource({
  type: 'sqlite',
  database: 'data/local.db',
  synchronize: false,
  logging: true,
  entities: [
    path.resolve(__dirname, '..', '..', 'app', '**', '*.entity.{ts,js}'),
  ],
  migrations: [path.resolve(__dirname, 'migrations', '*{.ts,.js}')],
  migrationsTableName: 'migrations',
});
