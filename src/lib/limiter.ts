import env from '@/lib/env';
import client from '@/lib/redis';
import { RedisRateLimiter } from 'rolling-rate-limiter';

const limiter = new RedisRateLimiter({
  client,
  namespace: 'rate-limiter',
  interval: env.RATE_LIMIT_INTERVAL,
  maxInInterval: env.RATE_LIMIT_MAX_IN_INTERVAL
});

export default limiter;
