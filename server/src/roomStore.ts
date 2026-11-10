import type { WebSocket } from 'ws';

export type Participant = {
  socket: WebSocket;
  userName: string;
  roomId: string;
};

export class RoomStore {
  private rooms = new Map<string, Map<WebSocket, string>>();

  join(roomId: string, socket: WebSocket, userName: string): void {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new Map();
      this.rooms.set(roomId, room);
    }
    room.set(socket, userName);
  }

  leave(roomId: string, socket: WebSocket): string | null {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    const userName = room.get(socket) ?? null;
    room.delete(socket);
    return userName;
  }

  findBySocket(socket: WebSocket): Participant | null {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.has(socket)) {
        return { socket, userName: room.get(socket) ?? 'unknown', roomId };
      }
    }
    return null;
  }

  removeSocket(socket: WebSocket): Participant | null {
    const participant = this.findBySocket(socket);
    if (!participant) {
      return null;
    }
    this.rooms.get(participant.roomId)?.delete(socket);
    return participant;
  }

  listRooms(): { id: string; participants: string[] }[] {
    return [...this.rooms.entries()].map(([id, room]) => ({
      id,
      participants: [...room.values()],
    }));
  }

  getParticipants(roomId: string): Map<WebSocket, string> {
    return this.rooms.get(roomId) ?? new Map();
  }

  getUserName(roomId: string, socket: WebSocket): string | null {
    return this.rooms.get(roomId)?.get(socket) ?? null;
  }

  getRoomIds(): string[] {
    return [...this.rooms.keys()];
  }
}
