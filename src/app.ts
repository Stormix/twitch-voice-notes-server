import { PrismaClient } from '@prisma/client';
import { Server } from 'bun';
import { Cron } from 'croner';
import { unlink } from 'node:fs/promises';
import prisma from './lib/db';
import Logger from './lib/logger';
import { getVoiceNote, record } from './lib/routes';
import { Client, WebSocket } from './types';

const CORS_HEADERS = {
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': '*',
    'Access-Control-Allow-Headers': '*'
  }
};

export class App {
  server: Server | null = null;
  heartbeat: ReturnType<typeof setInterval> | null = null;
  debug: boolean = true;
  clients: Record<string, Client> = {};
  logger = new Logger({ name: 'twitch-voice-notes' });
  db: PrismaClient = prisma;

  cron = Cron('0 */5 * * * *', async () => {
    // Delete all voice notes older than 5 minutes
    const voiceNotes = await this.db.voiceNote.findMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 5 * 60 * 1000)
        }
      }
    });

    if (voiceNotes.length === 0) return;

    this.logger.info('Deleting', voiceNotes.length, 'voice notes');

    // Delete files
    await Promise.all(
      voiceNotes.map((vn) => {
        try {
          unlink(vn.path);
        } catch (e) {
          this.logger.warn('Failed to delete file, does it exist?', vn.path);
        } finally {
          return;
        }
      })
    );

    // Delete records
    await this.db.voiceNote.deleteMany({
      where: {
        id: {
          in: voiceNotes.map((vn) => vn.id)
        }
      }
    });
  });

  constructor() {}

  listen(port: number | string) {
    this.db.$connect();
    this.logger.info('Starting server on port', port);
    this.server = Bun.serve({
      port,
      fetch: (req, server) => {
        // Handle CORS preflight requests
        if (req.method === 'OPTIONS') {
          const res = new Response('Ok', CORS_HEADERS);
          return res;
        }

        const url = new URL(req.url);
        switch (url.pathname) {
          case '/':
            return new Response(JSON.stringify({ health: 'ok' }), {
              headers: {
                'content-type': 'application/json'
              }
            });
          case '/record': {
            return record(req, this);
          }
          case '/audio':
            return getVoiceNote(req);
          case '/ws':
            if (
              server.upgrade(req, {
                data: {
                  id: crypto.randomUUID()
                }
              })
            ) {
              return;
            }
            return new Response('Upgrade failed :(', { status: 500 });
          default:
            return new Response('Not found', { status: 404 });
        }
      },
      websocket: {
        open: (ws: WebSocket) => {
          this.logger.info('Client connected', ws.data.id);
          this.clients[ws.data.id] = {
            id: ws.data.id,
            isAlive: true,
            ws
          };
        },
        close: (ws: WebSocket) => {
          this.logger.info('Client disconnected', ws.data.id);
          delete this.clients[ws.data.id];
        },
        message: (ws: WebSocket, message) => {
          const payload = JSON.parse(message as string);
          if (this.debug) this.logger.debug('Message received from', ws.data.id, payload);
          //   this.handlers.forEach((handler) => handler.listen(ws, payload));
        },
        pong: (ws) => {
          if (this.debug) this.logger.debug('Pong received from', ws.data.id);
          const client = this.clients[ws.data.id];
          if (!client) return;
          this.clients[ws.data.id].isAlive = true;
        }
      }
    });

    this.heartbeat = setInterval(() => {
      Object.values(this.clients).forEach((client) => {
        if (!client.isAlive) {
          console.info('Client', client.id, 'is dead, removing from clients');
          delete this.clients[client.id];
          return;
        }
        client.isAlive = false;
        client.ws.ping();
      });
    }, 5_000);
  }

  stop() {
    Object.values(this.clients).forEach((client) => client.ws.close());
    this.server?.stop(true);
    clearInterval(this.heartbeat || undefined);
    this.db.$disconnect();
  }

  sendToAll(payload: unknown) {
    Object.values(this.clients).forEach((client) => client.ws.send(JSON.stringify(payload)));
  }
}

export default new App();
