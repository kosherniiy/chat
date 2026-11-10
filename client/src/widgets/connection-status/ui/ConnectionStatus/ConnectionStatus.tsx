import type { ConnectionStatus as Status } from '@shared/types';
import styles from './ConnectionStatus.module.scss';

type ConnectionStatusProps = {
  status: Status;
};

const STATUS_LABEL: Record<Status, string> = {
  disconnected: 'Отключено',
  connecting: 'Подключение…',
  connected: 'В сети',
  error: 'Ошибка',
};

export const ConnectionStatus = ({ status }: ConnectionStatusProps) => {
  return (
    <div className={styles.root} data-status={status} role="status" aria-live="polite">
      <span className={styles.dot} aria-hidden />
      <span>{STATUS_LABEL[status]}</span>
    </div>
  );
};
