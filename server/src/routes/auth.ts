import { Router } from 'express';
import { clearAuthCookie, setAuthCookie } from '../auth/cookies';
import { signAuthToken } from '../auth/jwt';
import { userStore } from '../auth/userStore';
import { requireAuth, type AuthedRequest } from '../middleware/auth';

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const createAuthRouter = (): Router => {
  const router = Router();

  router.post('/auth/register', async (req, res) => {
    const username = req.body?.username;
    const password = req.body?.password;

    if (!isNonEmptyString(username) || !isNonEmptyString(password)) {
      res.status(400).json({ error: 'username and password are required' });
      return;
    }

    const result = await userStore.register(username, password);
    if ('error' in result) {
      res.status(409).json({ error: result.error });
      return;
    }

    const token = signAuthToken(result);
    setAuthCookie(res, token);
    res.status(201).json({ user: result });
  });

  router.post('/auth/login', async (req, res) => {
    const username = req.body?.username;
    const password = req.body?.password;

    if (!isNonEmptyString(username) || !isNonEmptyString(password)) {
      res.status(400).json({ error: 'username and password are required' });
      return;
    }

    const result = await userStore.login(username, password);
    if ('error' in result) {
      res.status(401).json({ error: result.error });
      return;
    }

    const token = signAuthToken(result);
    setAuthCookie(res, token);
    res.status(200).json({ user: result });
  });

  router.post('/auth/logout', (_req, res) => {
    clearAuthCookie(res);
    res.status(200).json({ ok: true });
  });

  router.get('/auth/me', requireAuth, (req: AuthedRequest, res) => {
    res.status(200).json({ user: req.user });
  });

  return router;
};
