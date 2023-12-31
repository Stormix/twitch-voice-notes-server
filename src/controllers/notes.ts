import Controller from '@/controllers/base';
import ws from '@/controllers/ws';
import { CORS_HEADERS } from '@/lib/config';
import { prisma } from '@/lib/db';
import { recordPayloadSchema } from '@/lib/validation';
import { writeFile } from 'node:fs/promises';

class NotesController extends Controller {
  async GET(req: Request) {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response('Not found', { status: 404 });
    }

    const voiceNote = await prisma.voiceNote.findUnique({
      where: {
        id
      }
    });

    if (!voiceNote) {
      return new Response('Not found', { status: 404 });
    }

    return new Response(Bun.file(voiceNote.path));
  }

  async POST(req: Request) {
    try {
      // Ensure the payload size is less than 5mb
      if (req.headers.get('content-length') && parseInt(req.headers.get('content-length')!) > 5 * 1024 * 1024) {
        return new Response('Payload too large', { status: 413 });
      }

      const formdata = await req.formData();
      const payload = recordPayloadSchema.parse(Object.fromEntries(formdata));
      const audio = formdata.get('audio') as unknown as Blob;

      if (!audio) {
        return new Response('No audio file', { status: 400 });
      }

      // TODO: ensure the audio buffer is safe before writing to disk

      const buffer = await audio.arrayBuffer();
      const path = `data/${crypto.randomUUID()}.wav`;

      this.logger.info('Writing file to', path);

      await writeFile(path, Buffer.from(buffer));

      const voiceNote = await prisma.voiceNote.create({
        data: {
          author: payload.author,
          author_color: payload.color,
          path,
          channel: payload.channel,
          duration: 0 // todo
        }
      });

      ws.broadcast({
        type: 'voice-note',
        channel: payload.channel,
        payload: voiceNote
      });

      return new Response(JSON.stringify({ sent: 'ok' }), {
        headers: {
          'content-type': 'application/json',
          ...CORS_HEADERS.headers
        }
      });
    } catch (e) {
      this.logger.error('> Failed to record');
      console.error(e);
      return new Response('Bad request', { status: 400 });
    }
  }
}

export default new NotesController();
