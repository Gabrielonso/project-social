import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from 'src/common/redis/redis.constants';
import { FeedType } from './enums/feed-type.enum';
import {
  PUBLIC_FEED_LIST_CACHE_PREFIX,
  RANKED_FEED_LIST_CACHE_PREFIX,
  feedBaseKey,
  feedTagsKey,
} from './feed-cache.keys';

@Injectable()
export class FeedCacheInvalidationService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Remove cached base + tags for one post (caption, media snapshot, tags list).
   */
  async invalidatePostEntity(postId: string): Promise<void> {
    await this.redis.del(
      feedBaseKey(FeedType.POST, postId),
      feedTagsKey(FeedType.POST, postId),
    );
  }

  /**
   * Remove cached base + tags for one ad.
   */
  async invalidateAdEntity(adId: string): Promise<void> {
    await this.redis.del(
      feedBaseKey(FeedType.AD, adId),
      feedTagsKey(FeedType.AD, adId),
    );
  }

  /**
   * Drop all short-lived full-page public feed responses so list order / visibility updates quickly.
   */
  async invalidatePublicFeedListCaches(): Promise<void> {
    await this.invalidateByPrefix(PUBLIC_FEED_LIST_CACHE_PREFIX);
    await this.invalidateByPrefix(RANKED_FEED_LIST_CACHE_PREFIX);
  }

  private async invalidateByPrefix(prefix: string): Promise<void> {
    const pattern = `${prefix}*`;
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        '200',
      );
      cursor = nextCursor;
      if (keys.length) {
        await this.redis.del(...keys);
      }
    } while (cursor !== '0');
  }

  async invalidatePostAndPublicList(postId: string): Promise<void> {
    await this.invalidatePostEntity(postId);
    await this.invalidatePublicFeedListCaches();
  }

  async invalidateAdAndPublicList(adId: string): Promise<void> {
    await this.invalidateAdEntity(adId);
    await this.invalidatePublicFeedListCaches();
  }
}
