import notes from '@/controllers/notes';
import ws from '@/controllers/ws';
import { CORS_HEADERS } from '@/lib/config';
import { deleteAllVoiceNotes, heartbeat } from '@/lib/cron';
import { prisma } from '@/lib/db';
import env from '@/lib/env';
import { logger } from '@/lib/logger';
import client from '@/lib/redis';
import Router from '@/lib/router';
import { Server } from 'bun';
import { Cron } from 'croner';

export class App {
  server: Server | null = null;
  debug = env.isDev;
  db = prisma;
  redis = client;
  cron: Cron[] = [];
  router: Router = new Router();

  async listen(port: number | string) {
    await this.redis.connect();
    logger.info('Connected to Redis');

    await this.db.$connect();
    logger.info('Connected to database');

    this.setup();

    this.server = Bun.serve({
      development: this.debug,
      port,
      fetch: this.router.fetch.bind(this.router),
      websocket: {
        open: ws.open.bind(ws),
        close: ws.close.bind(ws),
        message: ws.message.bind(ws),
        pong: ws.pong.bind(ws)
      }
    });

    logger.info('⚡ Starting server on port', port);
  }

  async stop() {
    this.server?.stop(true);
    await this.db.$disconnect();
    await this.redis.disconnect();
    this.cron.forEach((c) => c.stop());
    logger.info('Stopped server');
  }

  async setup() {
    this.setupRouter();
    this.setupCron();
  }

  setupCron() {
    this.cron = [new Cron('0 */30 * * * *', deleteAllVoiceNotes), new Cron('*/15 * * * * *', heartbeat)];
  }

  setupRouter() {
    this.router.get('/', () => Response.json({ health: 'ok', connectedClients: Object.keys(ws.clients).length }));
    this.router.get('/audio', (req) => notes.GET(req));
    this.router.post('/record', (req) => notes.POST(req));
    this.router.get('/ws', (req, server) => ws.upgrade(req, server));
    this.router.options('/*', () =>
      Response.json(
        {
          status: 'ok'
        },
        CORS_HEADERS
      )
    );
  }
}

export default new App();
