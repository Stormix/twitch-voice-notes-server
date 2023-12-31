import { bool, cleanEnv, num, port, str } from 'envalid';

const env = cleanEnv(process.env, {
  PORT: port({ default: 6969 }),
  ENABLED: bool({ default: true }),
  REDIS_HOST: str({ default: 'localhost' }),
  REDIS_PORT: port({ default: 6379 }),
  REDIS_PASSWORD: str({ default: '' }),
  RATE_LIMIT_INTERVAL: num({ default: 10_000 }),
  RATE_LIMIT_MAX_IN_INTERVAL: num({ default: 5 }),
  MAX_FILE_SIZE: num({ default: 2 }),
  TWITCH_CLIENT_ID: str({ default: '1n58hzg5bu9hrfuz3mz4b0v2dfmk92' })
});

export default env;
