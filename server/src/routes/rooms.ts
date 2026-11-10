import { Router } from 'express';
import type { MessageStore } from '../messageStore';
import type { RoomStore } from '../roomStore';

type RoomsRouterDeps = {
  roomStore: RoomStore;
  messageStore: MessageStore;
};

const PAGE_SIZE = 10;

export const createRoomsRouter = ({ roomStore, messageStore }: RoomsRouterDeps): Router => {
  const router = Router();

  /**
   * GET /rooms
   * Список всех комнат (активные + с историей сообщений).
   */
  router.get('/rooms', (_req, res) => {
    const active = roomStore.listRooms();
    const activeIds = new Set(active.map((room) => room.id));

    const rooms = [
      ...active.map((room) => ({
        id: room.id,
        participantsCount: room.participants.length,
        participants: room.participants,
      })),
      ...messageStore
        .getRoomIds()
        .filter((id) => !activeIds.has(id))
        .map((id) => ({
          id,
          participantsCount: 0,
          participants: [] as string[],
        })),
    ].sort((a, b) => a.id.localeCompare(b.id));

    res.status(200).json({ rooms });
  });

  /**
   * GET /rooms/:roomId/messages
   * Query:
   *   before — id сообщения-курсора; вернуть PAGE_SIZE более старых.
   * Без before — последние PAGE_SIZE сообщений.
   */
  router.get('/rooms/:roomId/messages', (req, res) => {
    const roomId = req.params.roomId?.trim();
    if (!roomId) {
      res.status(400).json({ error: 'roomId is required' });
      return;
    }

    const before = typeof req.query.before === 'string' ? req.query.before.trim() : '';

    if (before) {
      const page = messageStore.getBefore(roomId, before, PAGE_SIZE);
      if (!page) {
        res.status(404).json({ error: 'Message not found', before });
        return;
      }

      res.status(200).json({
        roomId,
        messages: page.messages,
        hasMore: page.hasMore,
        before,
      });
      return;
    }

    const page = messageStore.getLatest(roomId, PAGE_SIZE);
    res.status(200).json({
      roomId,
      messages: page.messages,
      hasMore: page.hasMore,
    });
  });

  return router;
};
