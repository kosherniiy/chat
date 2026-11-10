import http from 'http';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { CLIENT_ORIGIN, HOST, PORT } from './config';
import { MessageStore } from './messageStore';
import { RoomStore } from './roomStore';
import { requireAuth } from './middleware/auth';
import { createAuthRouter } from './routes/auth';
import { createDebugWsRouter } from './routes/debugWs';
import { createRoomsRouter } from './routes/rooms';
import { attachWebSocketServer } from './wsHandler';

const app = express();
const roomStore = new RoomStore();
const messageStore = new MessageStore();

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

app.use(createAuthRouter());
app.use(requireAuth, createRoomsRouter({ roomStore, messageStore }));

const server = http.createServer(app);
const wsControl = attachWebSocketServer(server, { roomStore, messageStore });

if (process.env.NODE_ENV !== 'production') {
  app.use(createDebugWsRouter(wsControl));
}

server.listen(PORT, HOST, () => {
  console.log(`HTTP  → http://localhost:${PORT}`);
  console.log(`WS    → ws://localhost:${PORT}`);
  console.log(`CORS  → ${CLIENT_ORIGIN}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log('Debug → GET/POST /debug/ws[/pause|/resume]');
  }
});
