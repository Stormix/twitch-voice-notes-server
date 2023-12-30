import { bool, cleanEnv, port } from 'envalid';

const env = cleanEnv(process.env, {
  PORT: port({ default: 6969 }),
  ENABLED: bool({ default: true })
});

export default env;
