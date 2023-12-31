import { createRedisClient } from '@/lib/redis';
import { RedisClientType } from 'redis';
import { Logger } from 'tslog';

class PubSub {
  private readonly _pubClient: RedisClientType;
  private readonly _subClient: RedisClientType;
  readonly logger = new Logger({ name: 'PubSub' });

  constructor() {
    this._pubClient = createRedisClient();
    this._subClient = createRedisClient();
  }
}

export default PubSub;
