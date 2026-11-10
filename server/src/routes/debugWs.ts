import { Router } from 'express';
import type { WsServerControl } from '../wsHandler';

export const createDebugWsRouter = (wsControl: WsServerControl): Router => {
  const router = Router();

  router.get('/debug/ws', (_req, res) => {
    res.status(200).json(wsControl.getStatus());
  });

  router.post('/debug/ws/pause', (_req, res) => {
    wsControl.pause();
    res.status(200).json(wsControl.getStatus());
  });

  router.post('/debug/ws/resume', (_req, res) => {
    wsControl.resume();
    res.status(200).json(wsControl.getStatus());
  });

  return router;
};
