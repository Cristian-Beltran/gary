import { registerAs } from '@nestjs/config';

export default registerAs('config', () => {
  return {
    database: {
      type: 'sqlite',
      path: 'data/local.db',
    },
    apiKey: 'local-api-key',
    jwtSecret: 'local-dev-jwt-secret',
    migrationSecret: 'local-migration-secret',
    openAi: {
      apiKey: process.env.OPENAI_API_KEY ?? '',
      model: 'gpt-4o-mini',
    },
  };
});
