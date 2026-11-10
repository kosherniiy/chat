import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import type { AuthUser } from '@chat/shared';

type StoredUser = AuthUser & {
  passwordHash: string;
};

export class UserStore {
  private usersByUsername = new Map<string, StoredUser>();

  async register(username: string, password: string): Promise<AuthUser | { error: string }> {
    const normalized = username.trim().toLowerCase();
    if (!normalized || password.length < 4) {
      return { error: 'username and password (min 4 chars) are required' };
    }

    if (this.usersByUsername.has(normalized)) {
      return { error: 'username already taken' };
    }

    const user: StoredUser = {
      id: randomUUID(),
      username: username.trim(),
      passwordHash: await bcrypt.hash(password, 10),
    };

    this.usersByUsername.set(normalized, user);
    return { id: user.id, username: user.username };
  }

  async login(username: string, password: string): Promise<AuthUser | { error: string }> {
    const normalized = username.trim().toLowerCase();
    const user = this.usersByUsername.get(normalized);
    if (!user) {
      return { error: 'invalid credentials' };
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return { error: 'invalid credentials' };
    }

    return { id: user.id, username: user.username };
  }

  findById(id: string): AuthUser | null {
    for (const user of this.usersByUsername.values()) {
      if (user.id === id) {
        return { id: user.id, username: user.username };
      }
    }
    return null;
  }
}

export const userStore = new UserStore();
