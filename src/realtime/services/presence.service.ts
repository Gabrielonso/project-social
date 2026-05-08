import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from 'src/common/redis/redis.constants';

export type PresenceStatus = 'online' | 'away' | 'offline';

@Injectable()
export class PresenceService {
  // Keep presence ephemeral; clients should heartbeat/reconnect.
  private readonly presenceTtlSeconds = 120;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private statusKey(userId: string) {
    return `presence:status:${userId}`;
  }

  async userConnected(userId: string) {
    const now = Date.now();
    await this.redis.set(this.statusKey(userId), `online:${now}`, 'EX', this.presenceTtlSeconds);
  }

  async userDisconnected(userId: string) {
    const now = Date.now();
    // keep a short-lived offline marker so other services can read "recently offline"
    await this.redis.set(this.statusKey(userId), `offline:${now}`, 'EX', this.presenceTtlSeconds);
  }

  async markAway(userId: string) {
    const now = Date.now();
    await this.redis.set(this.statusKey(userId), `away:${now}`, 'EX', this.presenceTtlSeconds);
  }

  async isOnline(userId: string): Promise<boolean> {
    const status = await this.getStatus(userId);
    return status === 'online';
  }

  async getStatus(userId: string): Promise<PresenceStatus> {
    const raw = await this.redis.get(this.statusKey(userId));
    if (!raw) return 'offline';
    const [status] = raw.split(':', 1) as [PresenceStatus];
    if (status === 'online' || status === 'away' || status === 'offline') return status;
    return 'offline';
  }

  async getStatuses(userIds: string[]): Promise<Map<string, PresenceStatus>> {
    const keys = userIds.map((id) => this.statusKey(id));
    const values = keys.length ? await this.redis.mget(keys) : [];
    const map = new Map<string, PresenceStatus>();
    for (let i = 0; i < userIds.length; i++) {
      const raw = values[i];
      const status = raw ? (raw.split(':', 1)[0] as PresenceStatus) : 'offline';
      map.set(userIds[i], status === 'online' || status === 'away' || status === 'offline' ? status : 'offline');
    }
    return map;
  }
}
