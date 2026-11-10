export const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3080';
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3080';

export const CLIENT_PING_INTERVAL_MS = Number(
  import.meta.env.VITE_CLIENT_PING_INTERVAL_MS ?? 15_000,
);
export const CLIENT_PING_TIMEOUT_MS = Number(
  import.meta.env.VITE_CLIENT_PING_TIMEOUT_MS ?? 5_000,
);
export const MESSAGE_ACK_TIMEOUT_MS = Number(
  import.meta.env.VITE_MESSAGE_ACK_TIMEOUT_MS ?? 8_000,
);
export const WS_RECONNECT_BASE_MS = Number(
  import.meta.env.VITE_WS_RECONNECT_BASE_MS ?? 1_000,
);
export const WS_RECONNECT_MAX_MS = Number(
  import.meta.env.VITE_WS_RECONNECT_MAX_MS ?? 30_000,
);
