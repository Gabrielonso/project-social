import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from 'src/common/redis/redis.constants';
import { CallSessionStatus } from '../enums/call-session-status.enum';
import { CallType } from '../enums/call-type.enum';

export type RedisCallSession = {
  callerId: string;
  calleeId: string;
  roomName: string;
  type: CallType;
  status: CallSessionStatus;
  createdAt: number;
};

@Injectable()
export class CallSessionService {
  private readonly sessionTtlSeconds = 120;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private sessionKey(uuid: string) {
    return `call:session:${uuid}`;
  }

  private userKey(userId: string) {
    return `call:user:${userId}`;
  }

  async setActiveCall(
    uuid: string,
    callerId: string,
    calleeId: string,
    roomName: string,
    type: CallType,
    status: CallSessionStatus,
  ): Promise<void> {
    const payload: RedisCallSession = {
      callerId,
      calleeId,
      roomName,
      type,
      status,
      createdAt: Date.now(),
    };
    const pipeline = this.redis.pipeline();
    pipeline.set(
      this.sessionKey(uuid),
      JSON.stringify(payload),
      'EX',
      this.sessionTtlSeconds,
    );
    pipeline.set(this.userKey(callerId), uuid, 'EX', this.sessionTtlSeconds);
    pipeline.set(this.userKey(calleeId), uuid, 'EX', this.sessionTtlSeconds);
    await pipeline.exec();
  }

  async updateStatus(uuid: string, status: CallSessionStatus): Promise<void> {
    const raw = await this.redis.get(this.sessionKey(uuid));
    if (!raw) return;
    const session = JSON.parse(raw) as RedisCallSession;
    session.status = status;
    await this.redis.set(
      this.sessionKey(uuid),
      JSON.stringify(session),
      'EX',
      this.sessionTtlSeconds,
    );
  }

  async refreshSession(uuid: string): Promise<void> {
    const raw = await this.redis.get(this.sessionKey(uuid));
    if (!raw) return;
    const session = JSON.parse(raw) as RedisCallSession;
    const pipeline = this.redis.pipeline();
    pipeline.expire(this.sessionKey(uuid), this.sessionTtlSeconds);
    pipeline.expire(this.userKey(session.callerId), this.sessionTtlSeconds);
    pipeline.expire(this.userKey(session.calleeId), this.sessionTtlSeconds);
    await pipeline.exec();
  }

  async getUserActiveCallUuid(userId: string): Promise<string | null> {
    return this.redis.get(this.userKey(userId));
  }

  async clearActiveCall(uuid: string): Promise<void> {
    const raw = await this.redis.get(this.sessionKey(uuid));
    const pipeline = this.redis.pipeline();
    pipeline.del(this.sessionKey(uuid));
    if (raw) {
      const session = JSON.parse(raw) as RedisCallSession;
      pipeline.del(this.userKey(session.callerId));
      pipeline.del(this.userKey(session.calleeId));
    }
    await pipeline.exec();
  }
}
