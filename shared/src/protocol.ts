export const WS_EVENT = {
  JOIN: 'join',
  MESSAGE: 'message',
  MESSAGE_DELETE: 'message-delete',
  LEAVE: 'leave',
  SYSTEM: 'system',
  TYPING_START: 'typing-start',
  TYPING_FINISH: 'typing-finish',
  PING: 'ping',
  PONG: 'pong',
} as const;

export type ServerEventType = (typeof WS_EVENT)[keyof typeof WS_EVENT];

export type User = {
  id: string;
  name: string;
};

export type Room = {
  id: string;
  participantsCount: number
  participants: User[];
};

export type ChatMessage = {
  id: string;
  roomId: string;
  author: string;
  text: string;
  timestamp: number;
  clientMessageId?: string;
};

export type JoinPayload = {
  roomId: string;
  userName: string;
};

export type MessagePayload = {
  roomId: string;
  author: string;
  text: string;
  timestamp: number;
  id?: string;
  clientMessageId?: string;
};

export type HeartbeatPayload = {
  ts?: number;
};

export type LeavePayload = {
  roomId: string;
  userName: string;
};

export type SystemPayload = {
  roomId: string;
  text: string;
  timestamp: number;
};

export type TypingPayload = {
  author: string;
  roomId: string;
};

export type DeleteMessagePayload = {
  roomId: string;
  messageId: string;
};

export type WsClientMessage =
  | { type: typeof WS_EVENT.JOIN; payload: JoinPayload }
  | { type: typeof WS_EVENT.MESSAGE; payload: MessagePayload }
  | { type: typeof WS_EVENT.MESSAGE_DELETE; payload: DeleteMessagePayload }
  | { type: typeof WS_EVENT.LEAVE; payload: LeavePayload }
  | { type: typeof WS_EVENT.TYPING_START; payload: Pick<TypingPayload, 'author'> }
  | { type: typeof WS_EVENT.TYPING_FINISH; payload: Pick<TypingPayload, 'author'> }
  | { type: typeof WS_EVENT.PING; payload: HeartbeatPayload };

export type WsServerMessage =
  | { type: typeof WS_EVENT.MESSAGE; payload: MessagePayload }
  | {
      type: typeof WS_EVENT.MESSAGE_DELETE;
      payload: DeleteMessagePayload & { ok: boolean; error?: string };
    }
  | { type: typeof WS_EVENT.SYSTEM; payload: SystemPayload }
  | { type: typeof WS_EVENT.JOIN; payload: JoinPayload & { ok: boolean; error?: string } }
  | { type: typeof WS_EVENT.LEAVE; payload: LeavePayload & { ok: boolean } }
  | { type: typeof WS_EVENT.TYPING_START; payload: TypingPayload }
  | { type: typeof WS_EVENT.TYPING_FINISH; payload: TypingPayload }
  | { type: typeof WS_EVENT.PONG; payload: HeartbeatPayload };

export type WsMessage = WsClientMessage | WsServerMessage;

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type RoomListItem = {
  id: string;
  participantsCount: number;
  participants: string[];
};

export type RoomsResponse = {
  rooms: RoomListItem[];
};

export type RoomMessagesResponse = {
  roomId: string;
  messages: ChatMessage[];
  hasMore: boolean;
  before?: string;
};

export type AuthCredentials = {
  username: string;
  password: string;
};

export type AuthUser = {
  id: string;
  username: string;
};

export type AuthUserResponse = {
  user: AuthUser;
};
