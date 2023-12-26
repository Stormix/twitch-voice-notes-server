import { cleanEnv, port } from 'envalid';

const env = cleanEnv(process.env, {
  PORT: port({ default: 6969 })
});

export default env;
