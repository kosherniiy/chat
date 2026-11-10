# Backend API

Базовый URL (по умолчанию): `http://localhost:3080`  
WebSocket URL (по умолчанию): `ws://localhost:3080`

Типы протокола: `@chat/shared` → `shared/src/protocol.ts`.

---

## Конфигурация

| Переменная              | По умолчанию            | Описание                                      |
| ----------------------- | ----------------------- | --------------------------------------------- |
| `PORT`                  | `3080`                  | HTTP/WS порт                                  |
| `HOST`                  | `0.0.0.0`               | Адрес прослушивания                           |
| `CLIENT_ORIGIN`         | `http://localhost:5471` | CORS origin для HTTP                          |
| `HEARTBEAT_INTERVAL_MS` | `30000`                 | Интервал WS ping; без pong → `terminate`     |

CORS включён только для `CLIENT_ORIGIN`. Тело JSON парсится через `express.json()`.

---

## REST

### `GET /health`

Проверка живости процесса.

**Ответ** `200 OK`

```json
{
  "status": "ok",
  "uptime": 12.34,
  "timestamp": 1710000000000
}
```

| Поле        | Тип      | Описание                              |
| ----------- | -------- | ------------------------------------- |
| `status`    | `string` | Всегда `"ok"`                         |
| `uptime`    | `number` | Секунды с момента старта процесса     |
| `timestamp` | `number` | Unix time в миллисекундах             |

**Пример**

```bash
curl http://localhost:3080/health
```

---

### `GET /rooms`

Список всех комнат: с активными участниками и/или с сохранённой историей сообщений.

**Ответ** `200 OK`

```json
{
  "rooms": [
    {
      "id": "general",
      "participantsCount": 2,
      "participants": ["Alice", "Bob"]
    }
  ]
}
```

| Поле                 | Тип        | Описание                          |
| -------------------- | ---------- | --------------------------------- |
| `rooms[].id`         | `string`   | Идентификатор комнаты             |
| `rooms[].participantsCount` | `number` | Число online-участников    |
| `rooms[].participants` | `string[]` | Имена online-участников         |

**Пример**

```bash
curl http://localhost:3080/rooms
```

---

### `GET /rooms/:roomId/messages`

История сообщений комнаты (in-memory). Размер страницы — **10**.

Сообщения внутри ответа идут в хронологическом порядке (старые → новые).

| Query     | Тип      | По умолчанию | Описание |
| --------- | -------- | ------------ | -------- |
| `before`  | `string` | —            | id сообщения-курсора: вернуть 10 сообщений **старше** него |

**Без `before`** — последние 10 сообщений комнаты.

**С `before=<id>`** — 10 сообщений строго старше указанного (для подгрузки истории вверх).

**Ответ** `200 OK` (последние 10):

```json
{
  "roomId": "general",
  "messages": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "roomId": "general",
      "author": "Alice",
      "text": "Hello!",
      "timestamp": 1710000000000
    }
  ],
  "hasMore": true
}
```

**Ответ** `200 OK` (с курсором):

```json
{
  "roomId": "general",
  "messages": [ ],
  "hasMore": false,
  "before": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Поле       | Тип            | Описание                                              |
| ---------- | -------------- | ----------------------------------------------------- |
| `roomId`   | `string`       | Комната                                               |
| `messages` | `ChatMessage[]`| До 10 сообщений                                       |
| `hasMore`  | `boolean`      | Есть ли ещё более старые сообщения                     |
| `before`   | `string?`      | Эхо query-параметра, если курсор был передан          |

**Ошибки**

| Код | Когда |
| --- | ----- |
| `400` | пустой `roomId` |
| `404` | передан `before`, но сообщение с таким id не найдено |

**Примеры**

```bash
# последние 10
curl "http://localhost:3080/rooms/general/messages"

# 10 более старых относительно курсора
curl "http://localhost:3080/rooms/general/messages?before=550e8400-e29b-41d4-a716-446655440000"
```

История наполняется только из WS-событий `message`. После рестарта сервера память очищается.

---

## WebSocket

### Подключение

```
ws://localhost:3080
```

Сервер поднимается на том же HTTP-сервере (`ws` + Express). Отдельный path не используется: upgrade идёт на корень.

**Heartbeat (protocol).** Каждые `HEARTBEAT_INTERVAL_MS` (по умолчанию 30 с) сервер шлёт protocol-level `ping`. Браузер отвечает `pong` автоматически. Если к следующему тику `pong` не пришёл — сокет `terminate()`, участник убирается из комнаты (как при обычном `close`).

**Heartbeat (app-level).** Клиент дополнительно шлёт JSON `ping`; сервер отвечает JSON `pong` тому же сокету. Это позволяет клиенту быстрее обнаружить half-open соединение.

**Reconnect (client).** При неожиданном `close`/`ping`-timeout клиент переподключается с exponential backoff (`VITE_WS_RECONNECT_BASE_MS` → до `VITE_WS_RECONNECT_MAX_MS`) и заново шлёт `join` в текущую комнату. Явный `disconnect` (logout) реконнект не запускает.

**Debug WS pause (не production).** Процесс и in-memory stores не трогаются. `POST /debug/ws/pause` **не** рвёт уже открытые сокеты: сервер перестаёт отвечать (в т.ч. на app-level `ping`); новые upgrade отклоняются через `verifyClient` (HTTP 503, без `onopen` у клиента — backoff не сбрасывается). `POST /debug/ws/resume` снова принимает и отвечает. `GET /debug/ws` → `{ paused, clients }`. В DEV — кнопка в правом нижнем углу.

**Пример**

```bash
wscat -c ws://localhost:3080
```

### Формат кадров

Все сообщения — JSON-текст:

```json
{
  "type": "<event>",
  "payload": { }
}
```

| Поле      | Тип      | Обязательно | Описание        |
| --------- | -------- | ----------- | --------------- |
| `type`    | `string` | да          | Имя события     |
| `payload` | `object` | да          | Данные события  |

Невалидный JSON или объект без `type`/`payload` → сервер шлёт `system` с текстом  
`Invalid message format. Expected JSON with type and payload.`

Неизвестный `type` → `system` с текстом `Unknown event type`.

---

## События: Client → Server

### `join` — вход в комнату

```json
{
  "type": "join",
  "payload": {
    "roomId": "general",
    "userName": "Alice"
  }
}
```

| Поле       | Тип      | Правила                                      |
| ---------- | -------- | -------------------------------------------- |
| `roomId`   | `string` | непустая строка после `trim`                 |
| `userName` | `string` | непустая строка после `trim`                 |

**Ответ клиенту** — `join`:

Успех:

```json
{
  "type": "join",
  "payload": {
    "roomId": "general",
    "userName": "Alice",
    "ok": true
  }
}
```

Ошибка (пустые поля):

```json
{
  "type": "join",
  "payload": {
    "roomId": "",
    "userName": "",
    "ok": false,
    "error": "roomId and userName are required"
  }
}
```

**Побочные эффекты**

- Если сокет уже был в другой комнате — он удаляется оттуда, остальным уходит `system`: `"<name> left the room"`.
- Остальным в новой комнате (кроме вошедшего) уходит `system`: `"<name> joined the room"`.

---

### `message` — сообщение в комнату

Клиент должен сначала выполнить успешный `join` в эту комнату.

```json
{
  "type": "message",
  "payload": {
    "roomId": "general",
    "author": "Alice",
    "text": "Hello!",
    "timestamp": 1710000000000,
    "clientMessageId": "c7f1a2b0-9e3d-4c11-8f2a-1b6d0e4a9c21"
  }
}
```

| Поле              | Тип      | Правила                                                                 |
| ----------------- | -------- | ----------------------------------------------------------------------- |
| `roomId`          | `string` | непустая после `trim`                                                   |
| `author`          | `string` | непустая после `trim` (для валидации; авторство берётся из комнаты)     |
| `text`            | `string` | непустая после `trim`                                                   |
| `timestamp`       | `number` | если не число — сервер подставит `Date.now()`                           |
| `clientMessageId` | `string` | опционально; клиентский id для ack (эхо в broadcast)                    |

**Поведение**

- Сокет не состоит в `roomId` → лично клиенту `system`:  
  `"You must join the room before sending messages"`.
- Невалидный payload (пустые поля) → молчаливый ignore (ответа нет).
- Успех → broadcast `message` **всем** участникам комнаты, включая отправителя.
- В broadcast `author` = имя из хранилища комнаты (не из payload).
- Сервер добавляет `id` (`UUID`) и возвращает `clientMessageId`, если он был в запросе.

**Пример ответа (broadcast)**

```json
{
  "type": "message",
  "payload": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "roomId": "general",
    "author": "Alice",
    "text": "Hello!",
    "timestamp": 1710000000000,
    "clientMessageId": "c7f1a2b0-9e3d-4c11-8f2a-1b6d0e4a9c21"
  }
}
```

---

### `leave` — выход из комнаты

```json
{
  "type": "leave",
  "payload": {
    "roomId": "general",
    "userName": "Alice"
  }
}
```

| Поле       | Тип      | Правила                                      |
| ---------- | -------- | -------------------------------------------- |
| `roomId`   | `string` | непустая после `trim`                        |
| `userName` | `string` | используется только в ответе при `ok: false` |

**Ответ клиенту** — `leave`:

Успех:

```json
{
  "type": "leave",
  "payload": {
    "roomId": "general",
    "userName": "Alice",
    "ok": true
  }
}
```

Сокет не был в комнате:

```json
{
  "type": "leave",
  "payload": {
    "roomId": "general",
    "userName": "Alice",
    "ok": false
  }
}
```

Пустой `roomId` → молчаливый ignore.

При успешном выходе остальным в комнате уходит `system`: `"<name> left the room"`.  
Перед выходом остальным уходит `typing-finish` для этого пользователя.

---

### `message-delete` — удаление сообщения

Клиент:

```json
{
  "type": "message-delete",
  "payload": {
    "roomId": "general",
    "messageId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

| Поле        | Тип      | Правила                    |
| ----------- | -------- | -------------------------- |
| `roomId`    | `string` | непустая после `trim`      |
| `messageId` | `string` | id сообщения из истории    |

**Поведение**

- Сокет должен состоять в `roomId`.
- Удалять может только автор сообщения.
- При успехе сообщение удаляется из in-memory истории и уходит broadcast всем участникам комнаты (включая отправителя).
- При ошибке ответ только инициатору с `ok: false` и `error`.

**Успех (broadcast)**

```json
{
  "type": "message-delete",
  "payload": {
    "roomId": "general",
    "messageId": "550e8400-e29b-41d4-a716-446655440000",
    "ok": true
  }
}
```

**Ошибка (лично клиенту)**

```json
{
  "type": "message-delete",
  "payload": {
    "roomId": "general",
    "messageId": "550e8400-e29b-41d4-a716-446655440000",
    "ok": false,
    "error": "Only the author can delete this message"
  }
}
```

Возможные `error`: `roomId and messageId are required`, `You must join the room before deleting messages`, `Message not found`, `Only the author can delete this message`.

---

### `typing-start` / `typing-finish` — индикатор набора текста

Клиент:

```json
{
  "type": "typing-start",
  "payload": {
    "author": "Alice"
  }
}
```

```json
{
  "type": "typing-finish",
  "payload": {
    "author": "Alice"
  }
}
```

| Поле     | Тип      | Правила                                      |
| -------- | -------- | -------------------------------------------- |
| `author` | `string` | информативно; сервер берёт имя из комнаты    |

**Поведение**

- Сокет должен состоять в комнате, иначе событие игнорируется.
- Broadcast **остальным** участникам комнаты (отправителю не шлётся).
- В ответе сервер подставляет `author` из членства и добавляет `roomId`.
- `typing-finish` также уходит автоматически при `message`, `leave` и disconnect.

**Broadcast (Server → Client)**

```json
{
  "type": "typing-start",
  "payload": {
    "author": "Alice",
    "roomId": "general"
  }
}
```

---

### `ping` — проверка живости (client → server)

```json
{
  "type": "ping",
  "payload": {
    "ts": 1710000000000
  }
}
```

| Поле | Тип      | Правила                         |
| ---- | -------- | ------------------------------- |
| `ts` | `number` | опционально; эхо/метка клиента  |

**Поведение:** сервер отвечает только этому сокету событием `pong` (если `ts` не число — подставляет `Date.now()`).

```json
{
  "type": "pong",
  "payload": {
    "ts": 1710000000000
  }
}
```

---

## События: Server → Client

### `join`

Подтверждение входа. См. выше (`ok`, опционально `error`).

### `leave`

Подтверждение выхода. См. выше (`ok`).

### `message`

Чат-сообщение комнаты. Поля как в payload выше + `id` (+ `clientMessageId`, если клиент его прислал).

### `pong`

Ответ на client `ping`. См. выше.

### `system`

Системное уведомление.

```json
{
  "type": "system",
  "payload": {
    "roomId": "general",
    "text": "Alice joined the room",
    "timestamp": 1710000000000
  }
}
```

| Поле        | Тип      | Описание                                      |
| ----------- | -------- | --------------------------------------------- |
| `roomId`    | `string` | id комнаты; `""` для ошибок формата/типа      |
| `text`      | `string` | человекочитаемый текст                        |
| `timestamp` | `number` | Unix time в миллисекундах                     |

Типичные тексты:

| Текст                                              | Когда                                      |
| -------------------------------------------------- | ------------------------------------------ |
| `"<name> joined the room"`                         | кто-то вошёл (получают остальные)          |
| `"<name> left the room"`                           | выход через `leave` или смена комнаты      |
| `"<name> disconnected"`                            | закрытие WS-соединения                     |
| `"You must join the room before sending messages"` | `message` без членства                     |
| `"Invalid message format. ..."`                    | битый кадр                                 |
| `"Unknown event type"`                             | неизвестный `type`                         |

---

## Жизненный цикл соединения

1. Клиент открывает `ws://host:port`.
2. Отправляет `join`.
3. Обменивается `message` / получает `system` и чужие `message`.
4. Опционально шлёт `leave`.
5. При `close`/`disconnect` без `leave` сервер сам удаляет участника и шлёт остальным `system` с `"disconnected"`.

Один сокет = один участник. Повторный `join` в другую комнату автоматически выводит из предыдущей.

Хранилище комнат — in-memory `Map`. После рестарта сервера комнаты пустые.

---

## Сценарий проверки (`wscat`)

Терминал A:

```bash
wscat -c ws://localhost:3080
> {"type":"join","payload":{"roomId":"general","userName":"Alice"}}
```

Терминал B:

```bash
wscat -c ws://localhost:3080
> {"type":"join","payload":{"roomId":"general","userName":"Bob"}}
> {"type":"message","payload":{"roomId":"general","author":"Bob","text":"hi","timestamp":1710000000000}}
```

Ожидание:

- A получает `system` «Bob joined…», затем `message` от Bob.
- B получает свой `message` (broadcast включает отправителя).
