import type { ChatMessage } from '@chat/shared';

const DEFAULT_LIMIT = 10;

export class MessageStore {
  /** roomId → сообщения в хронологическом порядке (старые → новые) */
  private messages = new Map<string, ChatMessage[]>();

  add(message: ChatMessage): void {
    let list = this.messages.get(message.roomId);
    if (!list) {
      list = [];
      this.messages.set(message.roomId, list);
    }
    list.push(message);
  }

  find(roomId: string, messageId: string): ChatMessage | null {
    const list = this.messages.get(roomId);
    if (!list) {
      return null;
    }
    return list.find((item) => item.id === messageId) ?? null;
  }

  /** Удаляет сообщение. Возвращает удалённое или `null`, если не найдено. */
  remove(roomId: string, messageId: string): ChatMessage | null {
    const list = this.messages.get(roomId);
    if (!list) {
      return null;
    }

    const index = list.findIndex((item) => item.id === messageId);
    if (index === -1) {
      return null;
    }

    const [removed] = list.splice(index, 1);
    return removed ?? null;
  }

  getRoomIds(): string[] {
    return [...this.messages.keys()];
  }

  /**
   * Последние `limit` сообщений комнаты (от старых к новым внутри страницы).
   */
  getLatest(roomId: string, limit: number = DEFAULT_LIMIT): {
    messages: ChatMessage[];
    hasMore: boolean;
  } {
    const list = this.messages.get(roomId) ?? [];
    const messages = list.slice(-limit);
    return {
      messages,
      hasMore: list.length > messages.length,
    };
  }

  /**
   * `limit` сообщений старше указанного id (строго до курсора).
   * `null` — сообщение с таким id не найдено.
   */
  getBefore(
    roomId: string,
    beforeId: string,
    limit: number = DEFAULT_LIMIT,
  ): { messages: ChatMessage[]; hasMore: boolean } | null {
    const list = this.messages.get(roomId) ?? [];
    const cursorIndex = list.findIndex((item) => item.id === beforeId);

    if (cursorIndex === -1) {
      return null;
    }

    const start = Math.max(0, cursorIndex - limit);
    const messages = list.slice(start, cursorIndex);

    return {
      messages,
      hasMore: start > 0,
    };
  }
}
