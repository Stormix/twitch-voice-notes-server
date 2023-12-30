import { App, CORS_HEADERS } from '@/app';
import { writeFile } from 'node:fs/promises';
import { Logger } from 'tslog';
import prisma from './db';
import { recordPayloadSchema } from './validation';
const logger = new Logger({ name: '/record' });

export const record = async (req: Request, app: App) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

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

    logger.info('Writing file to', path);

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

    app.sendToAll({
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
    logger.error('> Failed to record');
    console.error(e);
    return new Response('Bad request', { status: 400 });
  }
};

export const getVoiceNote = async (req: Request) => {
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
};
