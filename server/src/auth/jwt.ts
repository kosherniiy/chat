import jwt from 'jsonwebtoken';
import type { AuthUser } from '@chat/shared';
import { JWT_EXPIRES_IN, JWT_SECRET } from '../config';

type JwtPayload = {
  sub: string;
  username: string;
};

export const signAuthToken = (user: AuthUser): string =>
  jwt.sign({ username: user.username }, JWT_SECRET, {
    subject: user.id,
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

export const verifyAuthToken = (token: string): AuthUser | null => {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (!payload.sub || !payload.username) {
      return null;
    }
    return { id: payload.sub, username: payload.username };
  } catch {
    return null;
  }
};
