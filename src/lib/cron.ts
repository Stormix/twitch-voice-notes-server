import app from '@/app';
import ws from '@/controllers/ws';
import { logger } from '@/lib/logger';
import { unlink } from 'node:fs/promises';

export const deleteAllVoiceNotes = async () => {
  // Delete all voice notes older than 5 minutes
  const voiceNotes = await app.db.voiceNote.findMany({
    where: {
      createdAt: {
        lt: new Date(Date.now() - 30 * 60 * 1000)
      }
    }
  });

  if (voiceNotes.length === 0) return;

  logger.info('Deleting', voiceNotes.length, 'voice notes');

  // Delete files
  await Promise.all(
    voiceNotes.map((vn) => {
      try {
        unlink(vn.path);
      } catch (e) {
        logger.warn('Failed to delete file, does it exist?', vn.path);
      } finally {
        return;
      }
    })
  );

  // Delete records
  await app.db.voiceNote.deleteMany({
    where: {
      id: {
        in: voiceNotes.map((vn) => vn.id)
      }
    }
  });
};

export const heartbeat = async () => {
  ws.exec((client) => {
    if (!client.isAlive) {
      ws.logger.info('Client', client.id, 'is dead, removing from clients');
      return ws.disconnect(client.id);
    }
    client.isAlive = false;
    client.ws.ping();
    ws.send(client, {
      type: 'heartbeat',
      payload: {
        timestamp: Date.now()
      }
    });
  });
};
