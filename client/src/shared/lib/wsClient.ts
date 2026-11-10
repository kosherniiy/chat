import type { WsClientMessage, WsServerMessage } from '@shared/types';
import {
  CLIENT_PING_INTERVAL_MS,
  CLIENT_PING_TIMEOUT_MS,
  WS_RECONNECT_BASE_MS,
  WS_RECONNECT_MAX_MS,
  WS_URL,
} from '@shared/config';

type MessageHandler = (message: WsServerMessage) => void;
type StatusHandler = (status: 'connecting' | 'open' | 'closed' | 'error') => void;

export class WsClient {
  private socket: WebSocket | null = null;

  private onMessageHandlers = new Set<MessageHandler>();

  private onStatusHandlers = new Set<StatusHandler>();

  private pingIntervalId: ReturnType<typeof setInterval> | null = null;

  private pongTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private awaitingPong = false;

  private intentionalClose = false;

  private reconnectAttempt = 0;

  private url = WS_URL;

  connect(url: string = WS_URL): void {
    this.intentionalClose = false;
    this.reconnectAttempt = 0;
    this.clearReconnectTimeout();
    this.url = url;
    this.notifyStatus('connecting');
    this.openSocket();
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.reconnectAttempt = 0;
    this.clearReconnectTimeout();
    this.teardownSocket();
    this.notifyStatus('closed');
  }

  send(message: WsClientMessage): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return false;
    }
    this.socket.send(JSON.stringify(message));
    return true;
  }

  onMessage(handler: MessageHandler): () => void {
    this.onMessageHandlers.add(handler);
    return () => {
      this.onMessageHandlers.delete(handler);
    };
  }

  onStatus(handler: StatusHandler): () => void {
    this.onStatusHandlers.add(handler);
    return () => {
      this.onStatusHandlers.delete(handler);
    };
  }

  private openSocket(): void {
    this.detachSocket();

    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.onopen = () => {
      this.reconnectAttempt = 0;
      this.notifyStatus('open');
      this.startHeartbeat();
    };

    socket.onclose = () => {
      this.stopHeartbeat();
      if (this.socket === socket) {
        this.socket = null;
      }

      if (this.intentionalClose) {
        this.notifyStatus('closed');
        return;
      }

      this.scheduleReconnect();
    };

    socket.onerror = () => {
      this.notifyStatus('error');
    };

    socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as WsServerMessage;
        if (data.type === 'pong') {
          this.handlePong();
          return;
        }
        this.onMessageHandlers.forEach((handler) => handler(data));
      } catch {
        // ignore malformed frames
      }
    };
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimeout();
    this.notifyStatus('connecting');

    const delay = Math.min(
      WS_RECONNECT_BASE_MS * 2 ** this.reconnectAttempt,
      WS_RECONNECT_MAX_MS,
    );
    this.reconnectAttempt += 1;

    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectTimeoutId = null;
      if (this.intentionalClose) {
        return;
      }
      this.openSocket();
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingIntervalId = setInterval(() => {
      this.sendPing();
    }, CLIENT_PING_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.pingIntervalId !== null) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
    this.clearPongTimeout();
    this.awaitingPong = false;
  }

  private sendPing(): void {
    if (this.awaitingPong) {
      this.failHeartbeat();
      return;
    }

    const sent = this.send({
      type: 'ping',
      payload: { ts: Date.now() },
    });

    if (!sent) {
      this.failHeartbeat();
      return;
    }

    this.awaitingPong = true;
    this.pongTimeoutId = setTimeout(() => {
      if (this.awaitingPong) {
        this.failHeartbeat();
      }
    }, CLIENT_PING_TIMEOUT_MS);
  }

  private handlePong(): void {
    this.awaitingPong = false;
    this.clearPongTimeout();
  }

  private failHeartbeat(): void {
    this.stopHeartbeat();
    this.notifyStatus('error');
    this.socket?.close();
  }

  private clearPongTimeout(): void {
    if (this.pongTimeoutId !== null) {
      clearTimeout(this.pongTimeoutId);
      this.pongTimeoutId = null;
    }
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }

  private detachSocket(): void {
    this.stopHeartbeat();
    if (!this.socket) {
      return;
    }

    this.socket.onopen = null;
    this.socket.onclose = null;
    this.socket.onerror = null;
    this.socket.onmessage = null;
    this.socket.close();
    this.socket = null;
  }

  private teardownSocket(): void {
    this.clearReconnectTimeout();
    this.detachSocket();
  }

  private notifyStatus(status: 'connecting' | 'open' | 'closed' | 'error'): void {
    this.onStatusHandlers.forEach((handler) => handler(status));
  }
}

export const wsClient = new WsClient();
