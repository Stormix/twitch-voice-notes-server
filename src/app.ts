import notes from '@/controllers/notes';
import ws from '@/controllers/ws';
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
  cron: Record<string, Cron> = {};
  router: Router = new Router();
  debug = env.isDev;
  db = prisma;
  redis = client;

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
    logger.info('Stopped server');

    await this.db.$disconnect();
    logger.info('Disconnected from database');

    await this.redis.disconnect();
    logger.info('Disconnected from Redis');

    this.cron.heartbeat.stop();
    this.cron.deleteAllVoiceNotes.stop();
    logger.info('Stopped cron jobs');
  }

  async setup() {
    this.setupRouter();
    this.setupCron();
  }

  setupCron() {
    this.cron = {
      heartbeat: new Cron('*/15 * * * * *', heartbeat),
      deleteAllVoiceNotes: new Cron('0 */30 * * * *', deleteAllVoiceNotes)
    };
  }

  setupRouter() {
    this.router.get('/', () => Response.json({ health: 'ok', connectedClients: Object.keys(ws.clients).length }));
    this.router.get('/ws', (req, server) => ws.UPGRADE(req, server));
    this.router.get('/audio', (req) => notes.GET(req));
    this.router.post('/record', (req, server) => notes.POST(req, server));
  }
}

export default new App();
