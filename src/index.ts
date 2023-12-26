import { App } from '@/app';
import env from '@/lib/env';
import Logger from '@/lib/logger';

const logger = new Logger({ name: 'twitch-voice-notes' });

const main = async () => {
  const app = new App();
  return app.listen(env.PORT);
};

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
