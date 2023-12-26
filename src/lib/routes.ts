import { recordPayloadSchema } from './validation';

export const record = async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const formdata = await req.formData();
    const payload = recordPayloadSchema.parse(Object.fromEntries(formdata));
    const audio = formdata.get('audio');
    if (!audio) {
      return new Response('No audio file', { status: 400 });
    }

    const path = `data/${crypto.randomUUID()}.wav`;

    console.log(payload, audio);

    // await Bun.write(path, audio as any);

    // const voiceNote = await prisma.voiceNote.create({
    //   data: {
    //     author: payload.author,
    //     path,
    //     duration: 0 // todo
    //   }
    // });

    return new Response('OK');
  } catch (e) {
    return new Response('Bad request', { status: 400 });
  }
};
