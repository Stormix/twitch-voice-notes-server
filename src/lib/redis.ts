import env from '@/lib/env';
import Logger from '@/lib/logger';
import { createClient } from 'redis';

const logger = new Logger({ name: 'Redis' });

const client = createClient({
  url: `redis://default:${env.REDIS_PASSWORD}@${env.REDIS_HOST}:${env.REDIS_PORT}`,
  socket: {
    reconnectStrategy: (retries: number): number | Error => {
      if (retries > 10) {
        logger.info('Too many retries on REDIS. Connection Terminated');
        return new Error('Too many retries.');
      } else {
        return retries;
      }
    }
  }
});

client.on('error', (error) => {
  logger.error("Couldn't connect to Redis");
  console.error(error);
});

export default client;
