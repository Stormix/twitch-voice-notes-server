import { User, VoiceNote, prisma } from '@/lib/db';

export const transform = async (voiceNote: VoiceNote & { user?: User }) => {
  const user =
    voiceNote.user ??
    (await prisma.user.findUnique({
      where: {
        id: voiceNote.userId
      }
    }));
  return {
    id: voiceNote.id,
    channel: voiceNote.channel,
    createdAt: voiceNote.createdAt,
    author: user?.name,
    author_color: user?.color
  };
};
