import { User, prisma } from '@/lib/db';
import env from '@/lib/env';
import Logger from '@/lib/logger';

export interface TwitchOAuthValidResponse {
  client_id: string;
  login: string;
  scopes: string[];
  user_id: string;
  expires_in: number;
  color?: string;
}

const logger = new Logger({ name: 'Twitch' });

const getUserColor = async (user_id: string, access_token: string) => {
  try {
    const response = await fetch(`https://api.twitch.tv/helix/chat/color?user_id=${user_id}`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Client-Id': env.TWITCH_CLIENT_ID
      }
    });

    const color = (await response.json()) as { data: Array<{ color: string }> };
    return color.data[0].color;
  } catch (error) {
    logger.warn('Failed to fetch user color', error);
    return '#FF69B4';
  }
};

export const verifyUser = async (base64: string): Promise<User | null> => {
  // Base 64 decode the token
  const decoded = Buffer.from(base64, 'base64').toString('utf-8');

  // Ensure the token is correct format
  if (!decoded.includes(':')) {
    throw new Error('Invalid token');
  }

  const [username, token] = decoded.split(':');

  // Ensure the token is valid
  try {
    const knownUser = await prisma.user.findUnique({
      where: {
        accessToken: token
      }
    });

    if (knownUser) {
      return knownUser;
    }

    const response = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Client-Id': env.TWITCH_CLIENT_ID
      }
    });

    const user = (await response.json()) as TwitchOAuthValidResponse;

    if (user.login !== username) {
      throw new Error('Invalid token');
    }

    const color = await getUserColor(user.user_id, token);
    logger.info('Logged in as: ', user.login, color);

    const dbUser = await prisma.user.upsert({
      where: {
        name: user.login // User name is trust worthy as it comes from Twitch
      },
      update: {
        color,
        accessToken: token
      },
      create: {
        name: user.login,
        accessToken: token,
        color
      }
    });

    return dbUser;
  } catch (error) {
    logger.error('Failed to fetch user', error);
    return null;
  }
};
