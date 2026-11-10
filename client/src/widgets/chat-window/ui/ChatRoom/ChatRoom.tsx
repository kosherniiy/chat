import { useEffect, useState } from 'react';
import type { ConnectionStatus as Status } from '@shared/types';
import type { MessageViewModel } from '@entities/message';
import { MessageInput } from '@features/send-message';
import { MessageList } from '@widgets/message-list';
import { ConnectionStatus } from '@widgets/connection-status';
import { wsClient } from '@/shared/lib/wsClient';
import styles from './ChatRoom.module.scss';

type ChatRoomProps = {
  roomId: string;
  userName: string;
  status: Status;
  messages: MessageViewModel[];
  typers: string[];
  onSendMessage?: (text: string) => void;
  onRetryMessage?: (clientMessageId: string) => void;
  onLeave?: () => void;
};

const EXIT_MS = 220;

const formatTypersLabel = (typers: string[]): string => {
  if (typers.length === 1) {
    return `${typers[0]} печатает`;
  }
  if (typers.length === 2) {
    return `${typers[0]} и ${typers[1]} печатают`;
  }
  return `${typers.slice(0, -1).join(', ')} и ${typers[typers.length - 1]} печатают`;
};

export const ChatRoom = ({
  roomId,
  userName,
  status,
  messages,
  typers,
  onSendMessage,
  onRetryMessage,
  onLeave,
}: ChatRoomProps) => {
  const [displayedTypers, setDisplayedTypers] = useState(typers);
  const [isVisible, setIsVisible] = useState(typers.length > 0);

  useEffect(() => {
    if (typers.length > 0) {
      setDisplayedTypers(typers);
      setIsVisible(true);
      return;
    }

    setIsVisible(false);
    const timer = window.setTimeout(() => {
      setDisplayedTypers([]);
    }, EXIT_MS);

    return () => window.clearTimeout(timer);
  }, [typers]);

  const onStartTyping = () => {
    wsClient.send({
      type: 'typing-start',
      payload: { author: userName },
    });
  };

  const onFinishTyping = () => {
    wsClient.send({
      type: 'typing-finish',
      payload: { author: userName },
    });
  };

  const handleDeleteMessage = (id: string) => {
    wsClient.send({
      type: 'message-delete',
      payload: { roomId, messageId: id },
    });
  };

  return (
    <section className={styles.room} aria-label={`Комната ${roomId}`}>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <div className={styles.roomBadge} aria-hidden>
            #
          </div>
          <div>
            <h2 className={styles.title}>{roomId}</h2>
            <p className={styles.subtitle}>вы вошли как {userName}</p>
            <div
              className={[styles.typers, isVisible ? styles.typersVisible : '']
                .filter(Boolean)
                .join(' ')}
              aria-live="polite"
              aria-hidden={!isVisible}
            >
              {displayedTypers.length > 0 ? (
                <div className={styles.typer}>
                  <span className={styles.typerLabel}>{formatTypersLabel(displayedTypers)}</span>
                  <span className={styles.dots} aria-hidden>
                    <span className={styles.dot} />
                    <span className={styles.dot} />
                    <span className={styles.dot} />
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className={styles.actions}>
          <ConnectionStatus status={status} />
          <button type="button" className={styles.leave} onClick={onLeave}>
            Выйти
          </button>
        </div>
      </header>

      <MessageList
        onDeleteMessage={handleDeleteMessage}
        onRetryMessage={onRetryMessage}
        messages={messages}
      />
      <MessageInput
        onStartTyping={onStartTyping}
        onFinishTyping={onFinishTyping}
        disabled={status !== 'connected'}
        onSend={onSendMessage}
      />
    </section>
  );
};
