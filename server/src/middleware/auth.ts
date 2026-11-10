import type { NextFunction, Request, Response } from 'express';
import type { AuthUser } from '@chat/shared';
import { verifyAuthToken } from '../auth/jwt';
import { AUTH_COOKIE_NAME } from '../config';

export type AuthedRequest = Request & {
  user?: AuthUser;
};

export const requireAuth = (req: AuthedRequest, res: Response, next: NextFunction): void => {
  const token = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const user = verifyAuthToken(token);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  req.user = user;
  next();
};
