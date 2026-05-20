import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { In, Repository } from 'typeorm';
import { REDIS_CLIENT } from 'src/common/redis/redis.constants';
import { User } from './entity/user.entity';
import { UserDisplay } from './types/user-display.types';

@Injectable()
export class UserDisplayService {
  private readonly cacheTtlSeconds = 86_400;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private cacheKey(userId: string): string {
    return `user:display:${userId}`;
  }

  async invalidate(userId: string): Promise<void> {
    await this.redis.del(this.cacheKey(userId));
  }

  async getByIds(userIds: string[]): Promise<Map<string, UserDisplay>> {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    const map = new Map<string, UserDisplay>();

    if (!uniqueIds.length) {
      return map;
    }

    const keys = uniqueIds.map((id) => this.cacheKey(id));
    const cached = await this.redis.mget(keys);
    const missingIds: string[] = [];

    for (let i = 0; i < uniqueIds.length; i++) {
      const raw = cached[i];
      if (!raw) {
        missingIds.push(uniqueIds[i]);
        continue;
      }

      try {
        map.set(uniqueIds[i], JSON.parse(raw) as UserDisplay);
      } catch {
        missingIds.push(uniqueIds[i]);
      }
    }

    if (!missingIds.length) {
      return map;
    }

    const users = await this.userRepository.find({
      where: { id: In(missingIds) },
      select: ['id', 'username', 'profilePicture'],
    });

    const pipeline = this.redis.pipeline();

    for (const user of users) {
      const display: UserDisplay = {
        userId: user.id,
        username: user.username,
        ...(user.profilePicture ? { profilePicture: user.profilePicture } : {}),
      };
      map.set(user.id, display);
      pipeline.set(
        this.cacheKey(user.id),
        JSON.stringify(display),
        'EX',
        this.cacheTtlSeconds,
      );
    }

    if (users.length) {
      await pipeline.exec();
    }

    return map;
  }
}
