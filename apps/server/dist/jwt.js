import { jwtVerify } from 'jose';
import { env } from './env.js';
export async function verifyAccessToken(token) {
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
    }
    catch (error) {
        throw new Error('Invalid access token');
    }
}
//# sourceMappingURL=jwt.js.map