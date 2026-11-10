import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { ConnectionStatus } from '@shared/types';
import type { MessageViewModel } from '@entities/message';
import { useAuth } from '@app/providers/auth';
import { JoinRoomForm, type JoinRoomFormValues } from '@features/join-room';
import { ChatRoom } from '@widgets/chat-window';
import { MESSAGE_ACK_TIMEOUT_MS, WS_URL } from '@shared/config';
import { http } from '@/shared/api/http';
import { wsClient } from '@/shared/lib/wsClient';
import styles from './ChatPage.module.scss';

const STATUS_MAP = {
  connecting: 'connecting',
  error: 'error',
  closed: 'disconnected',
  open: 'connected',
} as const satisfies Record<'connecting' | 'error' | 'closed' | 'open', ConnectionStatus>;

const DELIVERY_ERROR = 'Не отправлено — нет связи с сервером';

export const ChatPage = () => {
  const { user, isLoading, logout } = useAuth();
  const [session, setSession] = useState<JoinRoomFormValues | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [messages, setMessages] = useState<MessageViewModel[]>([]);
  const [typers, setTypers] = useState<string[]>([]);

  const sessionRef = useRef(session);
  sessionRef.current = session;

  const ackTimeoutsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const clearAckTimeout = (clientMessageId: string) => {
    const timer = ackTimeoutsRef.current.get(clientMessageId);
    if (timer !== undefined) {
      clearTimeout(timer);
      ackTimeoutsRef.current.delete(clientMessageId);
    }
  };

  const clearAllAckTimeouts = () => {
    for (const timer of ackTimeoutsRef.current.values()) {
      clearTimeout(timer);
    }
    ackTimeoutsRef.current.clear();
  };

  const markMessageFailed = (clientMessageId: string, error = DELIVERY_ERROR) => {
    clearAckTimeout(clientMessageId);
    setMessages((prev) =>
      prev.map((message) =>
        message.clientMessageId === clientMessageId && message.status === 'pending'
          ? { ...message, status: 'failed', error }
          : message,
      ),
    );
  };

  const failAllPending = (error = DELIVERY_ERROR) => {
    clearAllAckTimeouts();
    setMessages((prev) =>
      prev.map((message) =>
        message.status === 'pending' ? { ...message, status: 'failed', error } : message,
      ),
    );
  };

  const scheduleAckTimeout = (clientMessageId: string) => {
    clearAckTimeout(clientMessageId);
    const timer = setTimeout(() => {
      markMessageFailed(clientMessageId);
    }, MESSAGE_ACK_TIMEOUT_MS);
    ackTimeoutsRef.current.set(clientMessageId, timer);
  };

  useEffect(() => {
    if (!user) {
      wsClient.disconnect();
      setStatus('disconnected');
      return;
    }

    wsClient.connect(WS_URL);

    const offStatus = wsClient.onStatus((next) => {
      const mapped = STATUS_MAP[next];
      setStatus(mapped);
      if (mapped === 'disconnected' || mapped === 'error') {
        failAllPending();
      }
    });

    const offMessage = wsClient.onMessage(({ type, payload }) => {
      const me = sessionRef.current?.userName ?? user.username;

      if (type === 'join' && payload.ok) {
        setSession({
          roomId: payload.roomId,
          userName: payload.userName,
        });
        sessionStorage.setItem('roomId', payload.roomId);
        return;
      }

      if (type === 'message') {
        const clientMessageId = payload.clientMessageId;

        if (clientMessageId) {
          clearAckTimeout(clientMessageId);
        }

        setMessages((prev) => {
          if (payload.id && prev.some((message) => message.id === payload.id)) {
            return prev;
          }

          if (clientMessageId) {
            const pendingIndex = prev.findIndex(
              (message) => message.clientMessageId === clientMessageId,
            );
            if (pendingIndex !== -1) {
              const next = [...prev];
              next[pendingIndex] = {
                author: payload.author,
                id: payload.id ?? clientMessageId,
                text: payload.text,
                timestamp: payload.timestamp,
                isOwn: payload.author === me,
                isSystem: false,
                clientMessageId,
                status: 'sent',
              };
              return next;
            }
          }

          return [
            ...prev,
            {
              author: payload.author,
              id: payload.id ?? '',
              text: payload.text,
              timestamp: payload.timestamp,
              isOwn: payload.author === me,
              isSystem: false,
              clientMessageId,
              status: 'sent',
            },
          ];
        });
        return;
      }

      if (type === 'typing-start' && payload.author !== me) {
        setTypers((prev) => (prev.includes(payload.author) ? prev : [...prev, payload.author]));
        return;
      }

      if (type === 'typing-finish' && payload.author !== me) {
        setTypers((prev) => prev.filter((typer) => typer !== payload.author));
        return;
      }

      if (type === 'message-delete' && payload.ok) {
        setMessages((prev) => prev.filter((message) => message.id !== payload.messageId));
      }
    });

    return () => {
      offStatus();
      offMessage();
      clearAllAckTimeouts();
      wsClient.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (!user || status !== 'connected') {
      return;
    }

    const roomId = sessionRef.current?.roomId ?? sessionStorage.getItem('roomId');
    if (!roomId) {
      return;
    }

    wsClient.send({
      type: 'join',
      payload: { userName: user.username, roomId },
    });
  }, [status, user]);

  useEffect(() => {
    if (!session?.roomId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const {
        data: { messages: history },
      } = await http.get<{ messages: MessageViewModel[] }>(`/rooms/${session.roomId}/messages`);

      if (cancelled) {
        return;
      }

      setMessages(
        history.map((message) => ({
          ...message,
          isOwn: message.author === session.userName,
          status: 'sent' as const,
        })),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.roomId, session?.userName]);

  const handleLogout = async () => {
    sessionStorage.removeItem('roomId');
    setSession(null);
    setMessages([]);
    setTypers([]);
    clearAllAckTimeouts();
    wsClient.disconnect();
    await logout();
  };

  const handleJoin = (values: JoinRoomFormValues) => {
    if (!user) {
      return;
    }

    wsClient.send({
      type: 'join',
      payload: {
        roomId: values.roomId,
        userName: user.username,
      },
    });
  };

  const sendChatMessage = (text: string, existingClientMessageId?: string) => {
    if (!session) {
      return;
    }

    const clientMessageId = existingClientMessageId ?? crypto.randomUUID();
    const timestamp = Date.now();

    if (existingClientMessageId) {
      setMessages((prev) =>
        prev.map((message) =>
          message.clientMessageId === existingClientMessageId
            ? {
                ...message,
                text,
                timestamp,
                status: 'pending',
                error: undefined,
              }
            : message,
        ),
      );
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: clientMessageId,
          clientMessageId,
          author: session.userName,
          text,
          timestamp,
          isOwn: true,
          isSystem: false,
          status: 'pending',
        },
      ]);
    }

    const sent = wsClient.send({
      type: 'message',
      payload: {
        author: session.userName,
        roomId: session.roomId,
        text,
        timestamp,
        clientMessageId,
      },
    });

    if (!sent) {
      markMessageFailed(clientMessageId);
      return;
    }

    scheduleAckTimeout(clientMessageId);

    wsClient.send({
      type: 'typing-finish',
      payload: { author: session.userName },
    });
  };

  const handleSendMessage = (text: string) => {
    sendChatMessage(text);
  };

  const handleRetryMessage = (clientMessageId: string) => {
    const message = messages.find(
      (item) => item.clientMessageId === clientMessageId && item.status === 'failed',
    );
    if (!message) {
      return;
    }
    sendChatMessage(message.text, clientMessageId);
  };

  const handleLeaveRoom = () => {
    if (session) {
      wsClient.send({
        type: 'leave',
        payload: {
          roomId: session.roomId,
          userName: session.userName,
        },
      });
    }

    sessionStorage.removeItem('roomId');
    setSession(null);
    setMessages([]);
    setTypers([]);
    clearAllAckTimeouts();
  };

  if (isLoading) {
    return (
      <main className={styles.page}>
        <p className={styles.lead}>Проверка сессии…</p>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <main className={styles.page}>
      <header className={styles.brand}>
        <p className={styles.eyebrow}>учебный проект</p>
        <h1 className={styles.heading}>WebSocket Chat</h1>
        <p className={styles.lead}>Авторизация JWT + комнаты в реальном времени</p>
      </header>

      {!session ? (
        <JoinRoomForm
          userName={user.username}
          onSubmit={handleJoin}
          onLogout={() => void handleLogout()}
          disabled={status !== 'connected'}
        />
      ) : (
        <ChatRoom
          roomId={session.roomId}
          userName={session.userName}
          status={status}
          messages={messages}
          typers={typers}
          onSendMessage={handleSendMessage}
          onRetryMessage={handleRetryMessage}
          onLeave={handleLeaveRoom}
        />
      )}
    </main>
  );
};
