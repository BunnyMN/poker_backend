import { jwtVerify } from 'jose';
import { env } from './env.js';

const DEBUG_MODE = false; // Set to true for local testing with fake tokens

export async function verifyAccessToken(
  token: string
): Promise<{ playerId: string }> {
  if (DEBUG_MODE && token.includes('.fake')) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.sub) return { playerId: payload.sub };
    } catch {}
  }
  try {
    const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });

    const playerId = payload.sub;
    if (!playerId || typeof playerId !== 'string') {
      throw new Error('Invalid token: missing sub claim');
    }

    return { playerId };
  } catch (error) {
    throw new Error('Invalid access token');
  }
}

