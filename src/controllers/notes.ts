import Controller from '@/controllers/base';
import ws from '@/controllers/ws';
import { transform } from '@/dto/voice-note';
import { prisma } from '@/lib/db';
import env from '@/lib/env';
import limiter from '@/lib/limiter';
import Logger from '@/lib/logger';
import { verifyUser } from '@/lib/twitch';
import { recordPayloadSchema } from '@/lib/validation';
import { Server } from 'bun';
import { writeFile } from 'node:fs/promises';

class NotesController extends Controller {
  logger = new Logger({ name: NotesController.name });

  async GET(req: Request) {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return this.notFound();
    }

    const voiceNote = await prisma.voiceNote.findUnique({
      where: {
        id
      }
    });

    if (!voiceNote) {
      return this.notFound();
    }

    return this.file(Bun.file(voiceNote.path));
  }

  async POST(req: Request, server: Server) {
    try {
      // Check IP rate limit
      const ip = server.requestIP(req);
      const rateLimitRes = await limiter.limitWithInfo(ip?.address || 'unknown');

      if (rateLimitRes.blocked) {
        this.logger.warn(`Rate limit exceeded for ${ip?.address || 'unknown'}`);
        return this.tooManyRequests(undefined, rateLimitRes.millisecondsUntilAllowed / 1000);
      }

      // Check bearer token
      const token = req.headers.get('authorization')?.split(' ')?.[1];
      if (!token) return this.unauthorized();

      const user = await verifyUser(token);
      if (!user) return this.unauthorized();

      // Check user rate limit
      const userRateLimit = await limiter.limitWithInfo(user.name);

      if (userRateLimit.blocked) {
        this.logger.warn(`Rate limit exceeded for ${user.name}`);
        return this.tooManyRequests(undefined, userRateLimit.millisecondsUntilAllowed / 1000);
      }

      // Ensure the payload size is less than MAX_FILE_SIZE mb
      if (
        req.headers.get('content-length') &&
        parseInt(req.headers.get('content-length')!) > env.MAX_FILE_SIZE * 1024 * 1024
      ) {
        this.logger.warn('Payload too large for', ip?.address || 'unknown');
        return this.tooLarge();
      }

      // Parse the form data
      const formdata = await req.formData();
      const payload = recordPayloadSchema.parse(Object.fromEntries(formdata));
      const audio = formdata.get('audio') as unknown as Blob;

      // Ensure the audio file exists
      if (!audio) {
        this.logger.warn('No audio file for', ip?.address || 'unknown');
        return this.badRequest({
          error: 'No audio file provided'
        });
      }

      const buffer = await audio.arrayBuffer();
      const path = `data/${crypto.randomUUID()}.wav`;

      this.logger.info(`Saving voice note from ${payload.author} to ${payload.channel} at ${path}`);
      await writeFile(path, Buffer.from(buffer));

      const voiceNote = await prisma.voiceNote.create({
        data: {
          user: {
            connect: {
              id: user.id
            }
          },
          path,
          channel: payload.channel
        }
      });

      ws.broadcast({
        type: 'voice-note',
        channel: payload.channel,
        payload: await transform({ ...voiceNote, user: user ?? undefined })
      });

      return this.ok();
    } catch (e) {
      this.logger.error('> Failed to record');
      console.error(e);
      return this.badRequest({
        error: 'Failed to record :)'
      });
    }
  }
}

export default new NotesController();
