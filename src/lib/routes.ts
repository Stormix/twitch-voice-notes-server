import { App } from '@/app';
import { writeFile } from 'node:fs/promises';
import { Logger } from 'tslog';
import prisma from './db';
import { recordPayloadSchema } from './validation';

import { readFile } from 'node:fs/promises';

const logger = new Logger({ name: '/record' });

export const record = async (req: Request, app: App) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const formdata = await req.formData();
    const payload = recordPayloadSchema.parse(Object.fromEntries(formdata));
    const audio = formdata.get('audio') as unknown as Blob;

    if (!audio) {
      return new Response('No audio file', { status: 400 });
    }

    const stream = audio.stream();
    const path = `data/${crypto.randomUUID()}.wav`;

    logger.info('Writing file to', path);

    await writeFile(path, stream);

    const voiceNote = await prisma.voiceNote.create({
      data: {
        author: payload.author,
        path,
        channel: payload.channel,
        duration: 0 // todo
      }
    });

    logger.info('Broadcasting voice note', voiceNote);

    app.sendToAll(
      JSON.stringify({
        type: 'voice-note',
        channel: payload.channel,
        payload: voiceNote
      })
    );

    logger.info('Voice note created', voiceNote);

    return new Response(JSON.stringify({ sent: 'ok' }), {
      headers: {
        'content-type': 'application/json'
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

  const stream = await readFile(voiceNote.path);

  return new Response(stream, {
    headers: {
      'content-type': 'audio/wav'
    }
  });
};
