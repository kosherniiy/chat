import { useEffect, useRef } from 'react';
import { MessageItem, type MessageViewModel } from '@entities/message';
import styles from './MessageList.module.scss';

type MessageListProps = {
  messages: MessageViewModel[];
  emptyText?: string;
  onDeleteMessage?: (id: string) => void;
  onRetryMessage?: (clientMessageId: string) => void;
};

export const MessageList = ({
  messages,
  onDeleteMessage,
  onRetryMessage,
  emptyText = 'Пока тихо — напишите первое сообщение',
}: MessageListProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon} aria-hidden>
          ✦
        </span>
        <p className={styles.emptyText}>{emptyText}</p>
      </div>
    );
  }

  return (
    <ul className={styles.list}>
      {messages.map((message) => (
        <MessageItem
          key={message.clientMessageId ?? message.id}
          message={message}
          onDelete={
            message.status === 'sent' || message.status === undefined
              ? onDeleteMessage
              : undefined
          }
          onRetry={onRetryMessage}
        />
      ))}
      <div ref={bottomRef} />
    </ul>
  );
};
