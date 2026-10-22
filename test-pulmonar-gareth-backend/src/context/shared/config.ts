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
    mqtt: {
      url: process.env.MQTT_URL ?? 'mqtt://localhost:1883',
      user: process.env.MQTT_USER ?? '',
      password: process.env.MQTT_PASSWORD ?? '',
      topicRoot: process.env.MQTT_TOPIC_ROOT ?? 'gary',
      deviceId: process.env.MQTT_DEVICE_ID ?? 'esp32-01',
    },
    openAi: {
      apiKey: process.env.OPENAI_API_KEY ?? '',
      model: 'gpt-4o-mini',
    },
  };
});
