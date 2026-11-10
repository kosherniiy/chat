export const PORT = Number(process.env.PORT ?? 3080);
export const HOST = process.env.HOST ?? '0.0.0.0';
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5471';
export const HEARTBEAT_INTERVAL_MS = Number(process.env.HEARTBEAT_INTERVAL_MS ?? 30_000);

export const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-chat-jwt-secret-change-me';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';
export const AUTH_COOKIE_NAME = 'Authorization';
