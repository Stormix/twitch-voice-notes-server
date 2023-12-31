import app from '@/app';
import env from '@/lib/env';
import Logger from '@/lib/logger';

const logger = new Logger({ name: 'twitch-voice-notes' });

const main = async () => {
  if (!env.ENABLED) {
    logger.warn('App is disabled, exiting');
    return;
  }

  return app.listen(env.PORT);
};

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
