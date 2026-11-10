import { useCallback, useEffect, useState } from 'react';
import { http } from '@/shared/api/http';
import styles from './WsDebugToggle.module.scss';

type WsDebugStatus = {
  paused: boolean;
  clients: number;
};

export const WsDebugToggle = () => {
  const [status, setStatus] = useState<WsDebugStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await http.get<WsDebugStatus>('/debug/ws');
      setStatus(data);
      setError(null);
    } catch {
      setError('debug API недоступен');
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const toggle = async () => {
    if (busy || !status) {
      return;
    }

    setBusy(true);
    try {
      const path = status.paused ? '/debug/ws/resume' : '/debug/ws/pause';
      const { data } = await http.post<WsDebugStatus>(path);
      setStatus(data);
      setError(null);
    } catch {
      setError('не удалось переключить');
    } finally {
      setBusy(false);
    }
  };

  const paused = status?.paused ?? false;
  const label = error
    ? 'WS debug: error'
    : status
      ? paused
        ? `WS paused · ${status.clients}`
        : `WS live · ${status.clients}`
      : 'WS debug…';

  return (
    <button
      type="button"
      className={[styles.root, paused ? styles.paused : styles.live].join(' ')}
      onClick={() => void toggle()}
      disabled={busy || !status}
      title={
        paused
          ? 'Снять паузу: снова отвечать на ping/сообщения'
          : 'Пауза WS: сокеты живы, ответов нет (ждём client ping-timeout)'
      }
    >
      <span className={styles.dot} aria-hidden />
      <span>{label}</span>
    </button>
  );
};
