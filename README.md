# WebSocket Chat (учебный проект)

Монорепозиторий чата для освоения WebSocket: React UI-каркас (без реальной WS-логики) и рабочий Node.js-сервер.

## Почему монорепо (`client/` + `server/` + `shared/`)

- Общие типы протокола живут в `@chat/shared` — клиент и сервер не расходятся по контракту.
- Один корневой `npm run dev` поднимает оба процесса.
- Проще линтить и собирать пакеты единообразно.

```
chat/
├── client/          # React + Vite + FSD (UI-заглушки)
├── server/          # Express + ws (полная логика)
├── shared/          # Типы и константы WS-протокола
├── package.json     # npm workspaces
└── README.md
```

## Быстрый старт

Требования: Node.js 18+.

```bash
npm install
npm run build -w shared
npm run dev
```

- Клиент: http://localhost:5471
- HTTP API: http://localhost:3080
- WebSocket: ws://localhost:3080

Отдельный запуск:

```bash
npm run dev -w server
npm run dev -w client
```

Линт и сборка:

```bash
npm run lint
npm run build
```

## API бэкенда

Полное описание REST и WebSocket: **[server/API.md](./server/API.md)**.

Кратко:

| Канал | Адрес | Назначение |
| ----- | ----- | ---------- |
| REST  | `POST /auth/register\|login`, `POST /auth/logout`, `GET /auth/me` | JWT в cookie `Authorization` |
| REST  | `GET /health` | healthcheck |
| REST  | `GET /rooms` | список комнат (auth) |
| REST  | `GET /rooms/:roomId/messages` | история (auth) |
| WS    | `ws://localhost:3080` | cookie JWT + `join` / `message` / … |

## Frontend (FSD)

Слои:

| Слой        | Назначение                                      |
| ----------- | ----------------------------------------------- |
| `app/`      | провайдеры, глобальные стили                    |
| `pages/`    | страница чата                                   |
| `widgets/`  | ChatRoom, MessageList, ConnectionStatus         |
| `features/` | JoinRoomForm, MessageInput                      |
| `entities/` | Message, Room, User                             |
| `shared/`   | ui-kit, ws-клиент (заглушка), config, types     |

UI **не** подключает реальный WebSocket. Локальный preview сообщений на странице — только для визуальной проверки.

## Переменные окружения

| Переменная       | По умолчанию              | Где     |
| ---------------- | ------------------------- | ------- |
| `PORT`                         | `3080`                  | server |
| `HOST`                         | `0.0.0.0`               | server |
| `CLIENT_ORIGIN`                | `http://localhost:5471` | server |
| `HEARTBEAT_INTERVAL_MS`        | `30000`                 | server |
| `VITE_WS_URL`                  | `ws://localhost:3080`   | client |
| `VITE_API_URL`                 | `http://localhost:3080` | client |
| `VITE_CLIENT_PING_INTERVAL_MS` | `15000`                 | client |
| `VITE_CLIENT_PING_TIMEOUT_MS`  | `5000`                  | client |
| `VITE_MESSAGE_ACK_TIMEOUT_MS`  | `8000`                  | client |
| `VITE_WS_RECONNECT_BASE_MS`    | `1000`                  | client |
| `VITE_WS_RECONNECT_MAX_MS`     | `30000`                 | client |

### Debug: пауза WebSocket

В non-production на сервере есть `/debug/ws`, `/debug/ws/pause`, `/debug/ws/resume`.  
Кнопка в правом нижнем углу (только Vite DEV) ставит WS на паузу **без** рестарта процесса: существующие сокеты остаются открытыми, но сервер не отвечает (клиент ловит ping-timeout); новые upgrade отклоняются (503), поэтому реконнект идёт с backoff 1→2→4… Комнаты и история в памяти остаются.
