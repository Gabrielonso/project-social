import { Injectable } from '@nestjs/common';

type PresenceStatus = 'online' | 'away' | 'offline';

@Injectable()
export class PresenceService {
  private onlineUsers = new Map<
    string,
    { lastSeen: number; status: PresenceStatus }
  >();

  userConnected(userId: string) {
    this.onlineUsers.set(userId, {
      status: 'online',
      lastSeen: Date.now(),
    });
  }

  userDisconnected(userId: string) {
    this.onlineUsers.set(userId, {
      status: 'offline',
      lastSeen: Date.now(),
    });
  }

  markAway(userId: string) {
    const user = this.onlineUsers.get(userId);
    if (user) {
      user.status = 'away';
    }
  }

  isOnline(userId: string): boolean {
    return this.onlineUsers.get(userId)?.status === 'online';
  }

  getStatus(userId: string): PresenceStatus {
    return this.onlineUsers.get(userId)?.status || 'offline';
  }
}
