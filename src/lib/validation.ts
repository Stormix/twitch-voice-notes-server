import { z } from 'zod';

export const recordPayloadSchema = z.object({
  author: z.string(),
  color: z.string(),
  channel: z.string()
});
