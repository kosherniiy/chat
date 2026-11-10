import type { MessageViewModel } from '../../model/types';
import styles from './MessageItem.module.scss';

type MessageItemProps = {
  message: MessageViewModel;
  onDelete?: (id: string) => void;
  onRetry?: (clientMessageId: string) => void;
};

const formatTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

export const MessageItem = ({ message, onDelete, onRetry }: MessageItemProps) => {
  if (message.isSystem) {
    return (
      <li className={styles.system} aria-label="system message">
        <span>{message.text}</span>
        <time dateTime={new Date(message.timestamp).toISOString()}>
          {formatTime(message.timestamp)}
        </time>
      </li>
    );
  }

  const isPending = message.status === 'pending';
  const isFailed = message.status === 'failed';

  return (
    <li
      className={[
        styles.item,
        message.isOwn ? styles.own : styles.other,
        isPending ? styles.pending : '',
        isFailed ? styles.failed : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`message from ${message.author}`}
    >
      <div className={styles.meta}>
        <span className={styles.author}>{message.author}</span>
        <div className={styles.metaRight}>
          <time dateTime={new Date(message.timestamp).toISOString()}>
            {formatTime(message.timestamp)}
          </time>
          {message.isOwn && onDelete && !isPending && !isFailed ? (
            <button
              type="button"
              className={styles.delete}
              onClick={() => onDelete(message.id)}
              aria-label="Удалить сообщение"
              title="Удалить"
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>
      <p className={styles.text}>{message.text}</p>
      {isPending ? <p className={styles.deliveryHint}>Отправляется…</p> : null}
      {isFailed ? (
        <div className={styles.deliveryError}>
          <span>{message.error ?? 'Не отправлено'}</span>
          {message.clientMessageId && onRetry ? (
            <button
              type="button"
              className={styles.retry}
              onClick={() => onRetry(message.clientMessageId!)}
            >
              Повторить
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
};
