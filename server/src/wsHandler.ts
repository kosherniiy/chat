import { randomUUID } from 'crypto';
import type { IncomingMessage, Server as HttpServer } from 'http';
import { WebSocketServer, type WebSocket, type RawData } from 'ws';
import {
  WS_EVENT,
  type AuthUser,
  type ChatMessage,
  type DeleteMessagePayload,
  type JoinPayload,
  type LeavePayload,
  type MessagePayload,
  type WsClientMessage,
  type WsServerMessage,
} from '@chat/shared';
import { getAuthTokenFromCookieHeader } from './auth/cookies';
import { verifyAuthToken } from './auth/jwt';
import { HEARTBEAT_INTERVAL_MS } from './config';
import type { MessageStore } from './messageStore';
import { RoomStore } from './roomStore';

type WsHandlerDeps = {
  roomStore: RoomStore;
  messageStore: MessageStore;
};

export type WsServerControl = {
  pause: () => void;
  resume: () => void;
  getStatus: () => { paused: boolean; clients: number };
};

const socketUsers = new WeakMap<WebSocket, AuthUser>();
const aliveSockets = new WeakSet<WebSocket>();

const send = (socket: WebSocket, message: WsServerMessage): void => {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
};

const broadcast = (
  store: RoomStore,
  roomId: string,
  message: WsServerMessage,
  except?: WebSocket,
): void => {
  for (const [socket] of store.getParticipants(roomId)) {
    if (except && socket === except) {
      continue;
    }
    send(socket, message);
  }
};

const parseMessage = (raw: RawData): WsClientMessage | null => {
  try {
    const data = JSON.parse(raw.toString()) as WsClientMessage;
    if (!data || typeof data !== 'object' || !('type' in data) || !('payload' in data)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const handleJoin = (store: RoomStore, socket: WebSocket, payload: JoinPayload): void => {
  const roomId = payload.roomId?.trim();
  const authUser = socketUsers.get(socket);

  if (!authUser) {
    send(socket, {
      type: WS_EVENT.JOIN,
      payload: {
        roomId: roomId ?? '',
        userName: '',
        ok: false,
        error: 'Unauthorized',
      },
    });
    return;
  }

  const userName = authUser.username;

  if (!isNonEmptyString(roomId)) {
    send(socket, {
      type: WS_EVENT.JOIN,
      payload: {
        roomId: roomId ?? '',
        userName,
        ok: false,
        error: 'roomId is required',
      },
    });
    return;
  }

  const previous = store.removeSocket(socket);
  if (previous) {
    broadcast(store, previous.roomId, {
      type: WS_EVENT.SYSTEM,
      payload: {
        roomId: previous.roomId,
        text: `${previous.userName} left the room`,
        timestamp: Date.now(),
      },
    });
  }

  store.join(roomId, socket, userName);

  send(socket, {
    type: WS_EVENT.JOIN,
    payload: { roomId, userName, ok: true },
  });

  broadcast(
    store,
    roomId,
    {
      type: WS_EVENT.SYSTEM,
      payload: {
        roomId,
        text: `${userName} joined the room`,
        timestamp: Date.now(),
      },
    },
    socket,
  );
};

const handleMessage = (
  store: RoomStore,
  messageStore: MessageStore,
  socket: WebSocket,
  payload: MessagePayload,
): void => {
  const roomId = payload.roomId?.trim();
  const text = payload.text?.trim();
  const author = payload.author?.trim();

  if (!isNonEmptyString(roomId) || !isNonEmptyString(text) || !isNonEmptyString(author)) {
    return;
  }

  const memberName = store.getUserName(roomId, socket);
  if (!memberName) {
    send(socket, {
      type: WS_EVENT.SYSTEM,
      payload: {
        roomId,
        text: 'You must join the room before sending messages',
        timestamp: Date.now(),
      },
    });
    return;
  }

  const clientMessageId = payload.clientMessageId?.trim();

  const stored: ChatMessage = {
    id: randomUUID(),
    roomId,
    author: memberName,
    text,
    timestamp: typeof payload.timestamp === 'number' ? payload.timestamp : Date.now(),
    ...(isNonEmptyString(clientMessageId) ? { clientMessageId } : {}),
  };

  messageStore.add(stored);

  broadcastTyping(store, socket, WS_EVENT.TYPING_FINISH);

  const message: WsServerMessage = {
    type: WS_EVENT.MESSAGE,
    payload: stored,
  };

  broadcast(store, roomId, message);
};

const broadcastTyping = (
  store: RoomStore,
  socket: WebSocket,
  type: typeof WS_EVENT.TYPING_START | typeof WS_EVENT.TYPING_FINISH,
): void => {
  const participant = store.findBySocket(socket);
  if (!participant) {
    return;
  }

  broadcast(
    store,
    participant.roomId,
    {
      type,
      payload: {
        author: participant.userName,
        roomId: participant.roomId,
      },
    },
    socket,
  );
};

const handleTyping = (
  store: RoomStore,
  socket: WebSocket,
  type: typeof WS_EVENT.TYPING_START | typeof WS_EVENT.TYPING_FINISH,
): void => {
  broadcastTyping(store, socket, type);
};

const handleMessageDelete = (
  store: RoomStore,
  messageStore: MessageStore,
  socket: WebSocket,
  payload: DeleteMessagePayload,
): void => {
  const roomId = payload.roomId?.trim();
  const messageId = payload.messageId?.trim();

  if (!isNonEmptyString(roomId) || !isNonEmptyString(messageId)) {
    send(socket, {
      type: WS_EVENT.MESSAGE_DELETE,
      payload: {
        roomId: roomId ?? '',
        messageId: messageId ?? '',
        ok: false,
        error: 'roomId and messageId are required',
      },
    });
    return;
  }

  const memberName = store.getUserName(roomId, socket);
  if (!memberName) {
    send(socket, {
      type: WS_EVENT.MESSAGE_DELETE,
      payload: {
        roomId,
        messageId,
        ok: false,
        error: 'You must join the room before deleting messages',
      },
    });
    return;
  }

  const existing = messageStore.find(roomId, messageId);
  if (!existing) {
    send(socket, {
      type: WS_EVENT.MESSAGE_DELETE,
      payload: {
        roomId,
        messageId,
        ok: false,
        error: 'Message not found',
      },
    });
    return;
  }

  if (existing.author !== memberName) {
    send(socket, {
      type: WS_EVENT.MESSAGE_DELETE,
      payload: {
        roomId,
        messageId,
        ok: false,
        error: 'Only the author can delete this message',
      },
    });
    return;
  }

  messageStore.remove(roomId, messageId);

  broadcast(store, roomId, {
    type: WS_EVENT.MESSAGE_DELETE,
    payload: {
      roomId,
      messageId,
      ok: true,
    },
  });
};

const handleLeave = (store: RoomStore, socket: WebSocket, payload: LeavePayload): void => {
  const roomId = payload.roomId?.trim();
  if (!isNonEmptyString(roomId)) {
    return;
  }

  const participant = store.findBySocket(socket);
  if (!participant || participant.roomId !== roomId) {
    send(socket, {
      type: WS_EVENT.LEAVE,
      payload: { roomId, userName: payload.userName ?? '', ok: false },
    });
    return;
  }

  broadcast(
    store,
    roomId,
    {
      type: WS_EVENT.TYPING_FINISH,
      payload: {
        author: participant.userName,
        roomId,
      },
    },
    socket,
  );

  const userName = store.leave(roomId, socket);
  if (!userName) {
    send(socket, {
      type: WS_EVENT.LEAVE,
      payload: { roomId, userName: payload.userName ?? '', ok: false },
    });
    return;
  }

  send(socket, {
    type: WS_EVENT.LEAVE,
    payload: { roomId, userName, ok: true },
  });

  broadcast(store, roomId, {
    type: WS_EVENT.SYSTEM,
    payload: {
      roomId,
      text: `${userName} left the room`,
      timestamp: Date.now(),
    },
  });
};

export const attachWebSocketServer = (
  httpServer: HttpServer,
  { roomStore, messageStore }: WsHandlerDeps,
): WsServerControl => {
  let paused = false;

  const wss = new WebSocketServer({
    server: httpServer,
    verifyClient: (_info, done) => {
      if (paused) {
        done(false, 503, 'WS paused');
        return;
      }
      done(true);
    },
  });

  const heartbeat = setInterval(() => {
    if (paused) {
      return;
    }

    for (const socket of wss.clients) {
      if (!aliveSockets.has(socket)) {
        socket.terminate();
        continue;
      }
      aliveSockets.delete(socket);
      socket.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);

  wss.on('close', () => {
    clearInterval(heartbeat);
  });

  wss.on('connection', (socket, request: IncomingMessage) => {
    const token = getAuthTokenFromCookieHeader(request.headers.cookie);
    const user = token ? verifyAuthToken(token) : null;

    if (!user) {
      send(socket, {
        type: WS_EVENT.SYSTEM,
        payload: {
          roomId: '',
          text: 'Unauthorized. Login required.',
          timestamp: Date.now(),
        },
      });
      socket.close(4401, 'Unauthorized');
      return;
    }

    socketUsers.set(socket, user);
    aliveSockets.add(socket);

    socket.on('pong', () => {
      aliveSockets.add(socket);
    });

    socket.on('message', (raw) => {
      // Debug pause: keep sockets open but stop answering (half-open simulation).
      if (paused) {
        return;
      }

      const message = parseMessage(raw);
      if (!message) {
        send(socket, {
          type: WS_EVENT.SYSTEM,
          payload: {
            roomId: '',
            text: 'Invalid message format. Expected JSON with type and payload.',
            timestamp: Date.now(),
          },
        });
        return;
      }

      switch (message.type) {
        case WS_EVENT.JOIN:
          handleJoin(roomStore, socket, message.payload);
          break;
        case WS_EVENT.MESSAGE:
          handleMessage(roomStore, messageStore, socket, message.payload);
          break;
        case WS_EVENT.MESSAGE_DELETE:
          handleMessageDelete(roomStore, messageStore, socket, message.payload);
          break;
        case WS_EVENT.LEAVE:
          handleLeave(roomStore, socket, message.payload);
          break;
        case WS_EVENT.TYPING_START:
          handleTyping(roomStore, socket, WS_EVENT.TYPING_START);
          break;
        case WS_EVENT.TYPING_FINISH:
          handleTyping(roomStore, socket, WS_EVENT.TYPING_FINISH);
          break;
        case WS_EVENT.PING:
          send(socket, {
            type: WS_EVENT.PONG,
            payload: {
              ts:
                typeof message.payload?.ts === 'number' ? message.payload.ts : Date.now(),
            },
          });
          break;
        default:
          send(socket, {
            type: WS_EVENT.SYSTEM,
            payload: {
              roomId: '',
              text: 'Unknown event type',
              timestamp: Date.now(),
            },
          });
      }
    });

    socket.on('close', () => {
      const participant = roomStore.findBySocket(socket);
      if (!participant) {
        return;
      }

      broadcast(
        roomStore,
        participant.roomId,
        {
          type: WS_EVENT.TYPING_FINISH,
          payload: {
            author: participant.userName,
            roomId: participant.roomId,
          },
        },
        socket,
      );

      roomStore.removeSocket(socket);

      broadcast(roomStore, participant.roomId, {
        type: WS_EVENT.SYSTEM,
        payload: {
          roomId: participant.roomId,
          text: `${participant.userName} disconnected`,
          timestamp: Date.now(),
        },
      });
    });

    socket.on('error', () => {});
  });

  return {
    pause: () => {
      // Do not terminate: client should discover the dead link via ping timeout.
      paused = true;
    },
    resume: () => {
      paused = false;
    },
    getStatus: () => ({
      paused,
      clients: wss.clients.size,
    }),
  };
};
