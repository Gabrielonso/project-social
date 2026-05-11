import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  ApiResponse,
  successResponse,
} from 'src/common/helpers/response.helper';
import { InjectRepository } from '@nestjs/typeorm';
import { FeedFilterDto } from './dtos/feed-filter.dto';
import {
  CachedBaseEntity,
  FollowPairRow,
  LikeBookmarkRow,
  RawFeedRow,
  TagDto,
  TagRow,
} from './types/feed.types';
import { Ad } from 'src/modules/ads/entities/ads.entity';
import { Post } from 'src/modules/posts/entities/post.entity';
import { FeedType } from './enums/feed-type.enum';
import { REDIS_CLIENT } from 'src/common/redis/redis.constants';
import Redis from 'ioredis';
import {
  feedBaseKey,
  feedTagsKey,
  publicFeedListCacheKey,
} from './feed-cache.keys';

@Injectable()
export class FeedService {
  private readonly baseEntityTtlSeconds = 300;
  private readonly tagsTtlSeconds = 300;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Post)
    private postRepo: Repository<Post>,
    @InjectRepository(Ad)
    private adRepo: Repository<Ad>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private encodeCursor(input: { createdAt: string; id: string }) {
    return Buffer.from(JSON.stringify(input), 'utf8').toString('base64');
  }

  private decodeCursor(
    cursor?: string,
  ): { createdAt: string; id: string } | null {
    if (!cursor) return null;
    try {
      const raw = Buffer.from(cursor, 'base64').toString('utf8');
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;

      const obj = parsed as Record<string, unknown>;

      const createdAt = obj.createdAt;
      const id = obj.id;
      if (typeof createdAt !== 'string' || typeof id !== 'string') return null;
      return { createdAt, id };
    } catch {
      return null;
    }
  }

  private async mgetJson<T>(keys: string[]): Promise<(T | null)[]> {
    if (!keys.length) return [];
    const raw = await this.redis.mget(keys);
    return raw.map((v) => {
      if (!v) return null;
      try {
        return JSON.parse(v) as T;
      } catch {
        return null;
      }
    });
  }

  private async setJson(key: string, value: unknown, ttlSeconds: number) {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async hydrateFeed(
    viewerId: string | undefined,
    rows: RawFeedRow[],
    page: number,
    limit: number,
    total: number,
  ) {
    const postIds = rows
      .filter((r) => r.type === FeedType.POST)
      .map((r) => r.id);

    const adIds = rows.filter((r) => r.type === FeedType.AD).map((r) => r.id);

    // ----------------------------
    // Smarter caching strategy:
    // - cache base post/ad payloads (shared, non-viewer specific)
    // - cache tags (shared)
    // - compute viewer-specific flags (likes/bookmarks/follows) per request
    // ----------------------------

    // 1) Tags: fetch from cache first
    const postTagKeys = postIds.map((id) => feedTagsKey(FeedType.POST, id));

    const adTagKeys = adIds.map((id) => feedTagsKey(FeedType.AD, id));

    const cachedPostTags = await this.mgetJson<TagDto[]>(postTagKeys);

    const cachedAdTags = await this.mgetJson<TagDto[]>(adTagKeys);

    const tagsByEntity = new Map<string, TagDto[]>();
    const missingPostTagIds: string[] = [];
    const missingAdTagIds: string[] = [];

    for (let i = 0; i < postIds.length; i++) {
      const id = postIds[i];
      const tags = cachedPostTags[i];
      if (tags) tagsByEntity.set(`${FeedType.POST}:${id}`, tags);
      else missingPostTagIds.push(id);
    }
    for (let i = 0; i < adIds.length; i++) {
      const id = adIds[i];
      const tags = cachedAdTags[i];
      if (tags) tagsByEntity.set(`${FeedType.AD}:${id}`, tags);
      else missingAdTagIds.push(id);
    }

    if (missingPostTagIds.length || missingAdTagIds.length) {
      const allTags =
        missingPostTagIds.length || missingAdTagIds.length
          ? await this.dataSource.query(
              `
              SELECT 
                entity::text AS entity,
                entity_id,
                id,
                user_id,
                username,
                user_avatar,
                type,
                start_index,
                end_index,
                created_at
              FROM tags
              WHERE 
                (entity = 'post' AND entity_id = ANY($1))
                OR
                (entity = 'ad' AND entity_id = ANY($2))
              ORDER BY created_at ASC
              `,
              [
                missingPostTagIds.length ? missingPostTagIds : [null],
                missingAdTagIds.length ? missingAdTagIds : [null],
              ],
            )
          : [];

      const tagMap = new Map<string, TagDto[]>();
      for (const tag of allTags as TagRow[]) {
        const key = `${tag.entity}:${tag.entity_id}`;
        if (!tagMap.has(key)) tagMap.set(key, []);
        tagMap.get(key)!.push({
          id: tag.id,
          userId: tag.user_id,
          username: tag.username,
          ...(tag.user_avatar ? { userAvatar: tag.user_avatar } : {}),
          type: tag.type,
          ...(tag.start_index != null ? { startIndex: tag.start_index } : {}),
          ...(tag.end_index != null ? { endIndex: tag.end_index } : {}),
          createdAt: tag.created_at,
        });
      }

      // Write missing tag keys
      const pipeline = this.redis.pipeline();
      for (const id of missingPostTagIds) {
        const key = `${FeedType.POST}:${id}`;
        const tags = tagMap.get(key) || [];
        tagsByEntity.set(key, tags);
        pipeline.set(
          feedTagsKey(FeedType.POST, id),
          JSON.stringify(tags),
          'EX',
          this.tagsTtlSeconds,
        );
      }
      for (const id of missingAdTagIds) {
        const key = `${FeedType.AD}:${id}`;
        const tags = tagMap.get(key) || [];
        tagsByEntity.set(key, tags);
        pipeline.set(
          feedTagsKey(FeedType.AD, id),
          JSON.stringify(tags),
          'EX',
          this.tagsTtlSeconds,
        );
      }
      await pipeline.exec();
    }

    // 2) Base posts/ads: fetch from cache first
    const postBaseKeys = postIds.map((id) => feedBaseKey(FeedType.POST, id));

    const adBaseKeys = adIds.map((id) => feedBaseKey(FeedType.AD, id));

    const cachedPosts = await this.mgetJson<CachedBaseEntity>(postBaseKeys);

    const cachedAds = await this.mgetJson<CachedBaseEntity>(adBaseKeys);

    const missingPostIds = postIds.filter((_, idx) => !cachedPosts[idx]);

    const missingAdIds = adIds.filter((_, idx) => !cachedAds[idx]);

    const fetchedPosts = missingPostIds.length
      ? await this.postRepo
          .createQueryBuilder('post')
          .leftJoinAndSelect('post.medias', 'medias')
          .leftJoinAndSelect('post.sound', 'sound')
          .select(['post', 'medias', 'sound'])
          .leftJoinAndSelect('medias.media', 'media')
          .where('post.id IN (:...ids)', { ids: missingPostIds })
          .getMany()
      : [];

    const fetchedAds = missingAdIds.length
      ? await this.adRepo
          .createQueryBuilder('ad')
          .leftJoinAndSelect('ad.medias', 'medias')
          .leftJoinAndSelect('ad.sound', 'sound')
          .select(['ad', 'medias', 'sound'])
          .leftJoinAndSelect('medias.media', 'media')
          .where('ad.id IN (:...ids)', { ids: missingAdIds })
          .getMany()
      : [];

    // Attach tags + cache the base entities
    if (fetchedPosts.length || fetchedAds.length) {
      const pipeline = this.redis.pipeline();
      for (const p of fetchedPosts) {
        const enriched = {
          ...p,
          tags: tagsByEntity.get(`${FeedType.POST}:${p.id}`) || [],
        };
        pipeline.set(
          feedBaseKey(FeedType.POST, p.id),
          JSON.stringify(enriched),
          'EX',
          this.baseEntityTtlSeconds,
        );
      }
      for (const a of fetchedAds) {
        const enriched = {
          ...a,
          tags: tagsByEntity.get(`${FeedType.AD}:${a.id}`) || [],
        };
        pipeline.set(
          feedBaseKey(FeedType.AD, a.id),
          JSON.stringify(enriched),
          'EX',
          this.baseEntityTtlSeconds,
        );
      }
      await pipeline.exec();
    }

    // Rebuild full post/ad arrays in the same order as ids
    const fetchedPostMap = new Map(fetchedPosts.map((p) => [p.id, p]));
    const fetchedAdMap = new Map(fetchedAds.map((a) => [a.id, a]));

    const posts: CachedBaseEntity[] = postIds
      .map((id, idx) => {
        const cached = cachedPosts[idx];
        if (cached) return cached;
        const p = fetchedPostMap.get(id);
        if (!p) return null;
        return {
          ...(p as unknown as CachedBaseEntity),
          tags: tagsByEntity.get(`${FeedType.POST}:${id}`) || [],
        };
      })
      .filter((v): v is CachedBaseEntity => v != null);

    const ads: CachedBaseEntity[] = adIds
      .map((id, idx) => {
        const cached = cachedAds[idx];
        if (cached) return cached;
        const a = fetchedAdMap.get(id);
        if (!a) return null;
        return {
          ...(a as unknown as CachedBaseEntity),
          tags: tagsByEntity.get(`${FeedType.AD}:${id}`) || [],
        };
      })
      .filter((v): v is CachedBaseEntity => v != null);

    const likes: LikeBookmarkRow[] = viewerId
      ? await this.dataSource.query(
          `
        SELECT entity, entity_id
        FROM likes
        WHERE user_id = $1
          AND (
            (entity = 'post' AND entity_id = ANY($2))
            OR
            (entity = 'ad' AND entity_id = ANY($3))
          )
        `,
          [viewerId, postIds, adIds],
        )
      : [];

    const bookmarks: LikeBookmarkRow[] = viewerId
      ? await this.dataSource.query(
          `
        SELECT entity, entity_id
        FROM bookmarks
        WHERE user_id = $1
          AND (
            (entity = 'post' AND entity_id = ANY($2))
            OR
            (entity = 'ad' AND entity_id = ANY($3))
          )
        `,
          [viewerId, postIds, adIds],
        )
      : [];

    const likedSet = new Set(likes.map((l) => `${l.entity}:${l.entity_id}`));

    const bookmarkedSet = new Set(
      bookmarks.map((l) => `${l.entity}:${l.entity_id}`),
    );

    // 3) Follow flags: compute in one query per page
    const ownerIds = viewerId
      ? [
          ...new Set(
            [...posts, ...ads]
              .map((e) => e.ownerId)
              .filter((id: string | undefined) => !!id && id !== viewerId),
          ),
        ]
      : [];

    const followPairs: FollowPairRow[] =
      viewerId && ownerIds.length
        ? await this.dataSource.query(
            `
            SELECT follower_id, following_id
            FROM follows
            WHERE
              (follower_id = $1 AND following_id = ANY($2))
              OR
              (following_id = $1 AND follower_id = ANY($2))
            `,
            [viewerId, ownerIds],
          )
        : [];

    const viewerFollows = new Set<string>();
    const ownerFollowsViewer = new Set<string>();
    for (const row of followPairs) {
      if (row.follower_id === viewerId) {
        viewerFollows.add(row.following_id);
      } else if (row.following_id === viewerId) {
        ownerFollowsViewer.add(row.follower_id);
      }
    }

    // Map for fast lookup
    const postMap = new Map(
      posts.map((p) => [
        p.id,
        {
          ...p,
          viewerHasLiked: likedSet.has(`${FeedType.POST}:${p.id}`),
          viewerHasBookmarked: bookmarkedSet.has(`${FeedType.POST}:${p.id}`),
          viewerFollowsOwner: viewerId
            ? viewerFollows.has(p.ownerId || '')
            : false,
          ownerFollowsViewer: viewerId
            ? ownerFollowsViewer.has(p.ownerId || '')
            : false,
        },
      ]),
    );
    const adMap = new Map(
      ads.map((a) => [
        a.id,
        {
          ...a,
          viewerHasLiked: likedSet.has(`${FeedType.AD}:${a.id}`),
          viewerHasBookmarked: bookmarkedSet.has(`${FeedType.AD}:${a.id}`),
          viewerFollowsOwner: viewerId
            ? viewerFollows.has(a.ownerId || '')
            : false,
          ownerFollowsViewer: viewerId
            ? ownerFollowsViewer.has(a.ownerId || '')
            : false,
        },
      ]),
    );

    // Rebuild ordered feed
    const feed = rows.map((row) => {
      if (row.type === FeedType.POST) {
        return {
          type: 'post',
          data: postMap.get(row.id),
        };
      }

      return {
        type: 'ad',
        data: adMap.get(row.id),
      };
    });

    return successResponse('Operation Successful', {
      data: feed,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    });
  }

  async getFeed(userId: string, feedFilterDto: FeedFilterDto) {
    const limit = Math.min(50, Number(feedFilterDto.limit) || 20);

    // Prefer cursor pagination at scale (no OFFSET scan).
    const decoded = this.decodeCursor(feedFilterDto.cursor);

    const cursorCreatedAt = decoded?.createdAt;
    const cursorId = decoded?.id;

    const cacheKey = publicFeedListCacheKey({
      viewerKey: userId || 'anon',
      limit,
      cursorToken: feedFilterDto.cursor || 'first',
    });

    const cached = await this.redis.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached) as ApiResponse<unknown>;
      } catch {
        // ignore cache parse errors
      }
    }
    const rows: RawFeedRow[] = await this.dataSource.query(
      `
      (
        SELECT
          p.id,
          'post' AS type,
          p.created_at AS "createdAt"
        FROM posts p
        WHERE p.is_public = true
          AND (
            $2::timestamp IS NULL
            OR (p.created_at, p.id) < ($2::timestamp, $3::uuid)
          )
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT $1
      )
      UNION ALL
      (
        SELECT
          a.id,
          'ad' AS type,
          a.created_at AS "createdAt"
        FROM ads a
        WHERE (
          $2::timestamp IS NULL
          OR (a.created_at, a.id) < ($2::timestamp, $3::uuid)
        )
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT $1
      )
      ORDER BY "createdAt" DESC, id DESC
      LIMIT $1
      `,
      [limit, cursorCreatedAt || null, cursorId || null],
    );

    // Backwards compatible shape: keep currentPage/totalPages, but avoid COUNT() at scale.
    // We return a "best effort" totalPages=1 and encourage cursor use.
    const page = Number(feedFilterDto.page) || 1;
    const total = limit; // placeholder; avoids expensive COUNT() on hot path

    const response = await this.hydrateFeed(userId, rows, page, limit, total);
    const responseData = (response.data ?? {}) as Record<string, unknown>;

    const last = rows[rows.length - 1];
    const nextCursor =
      last?.createdAt && last?.id
        ? this.encodeCursor({
            createdAt: new Date(last.createdAt).toISOString(),
            id: last.id,
          })
        : null;

    const withCursor: ApiResponse<unknown> = {
      ...response,
      data: {
        ...responseData,
        nextCursor,
        hasMore: rows.length === limit,
      },
    };

    await this.redis.set(cacheKey, JSON.stringify(withCursor), 'EX', 10);
    return withCursor;
  }

  async getMyPublishedFeed(userId: string, feedFilterDto: FeedFilterDto) {
    const page = Number(feedFilterDto.page) || 1;
    const limit = Number(feedFilterDto.limit) || 20;
    const offset = (page - 1) * limit;

    const rows: RawFeedRow[] = await this.dataSource.query(
      `
      (
        SELECT
          p.id,
          'post' AS type,
          p.created_at AS "createdAt"
        FROM posts p WHERE p.owner_id = $3
      )
      UNION ALL
      (
        SELECT
          a.id,
          'ad' AS type,
          a.created_at AS "createdAt"
        FROM ads a WHERE a.owner_id = $3
      )
      ORDER BY "createdAt" DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset, userId],
    );

    const totalRows: Array<{ count: string }> = await this.dataSource.query(
      `SELECT COUNT(*) FROM (
  SELECT id FROM posts WHERE owner_id = $1
  UNION ALL
  SELECT id FROM ads WHERE owner_id = $1
) t`,
      [userId],
    );

    const total = Number(totalRows[0]?.count || 0);
    return this.hydrateFeed(userId, rows, page, limit, total);
  }

  async getPresence(userId: string, feedFilterDto: FeedFilterDto) {
    const page = Number(feedFilterDto.page) || 1;
    const limit = Number(feedFilterDto.limit) || 20;
    const offset = (page - 1) * limit;

    const rows: RawFeedRow[] = await this.dataSource.query(
      `
      (
        SELECT
          l.entity_id AS id,
          l.entity::text AS type,
          l.created_at AS "createdAt"
        FROM likes l
        WHERE l.user_id = $3
          AND l.entity IN ('post', 'ad')
      )
      UNION
      (
        SELECT
          b.entity_id AS id,
          b.entity::text AS type,
          b.created_at AS "createdAt"
        FROM bookmarks b
        WHERE b.user_id = $3
          AND b.entity IN ('post', 'ad')
      )
      ORDER BY "createdAt" DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset, userId],
    );
    const totalRows: Array<{ count: string }> = await this.dataSource.query(
      `SELECT COUNT(*) FROM (
      (
        SELECT
          l.entity_id AS id,
          l.entity::text AS type,
          l.created_at AS "createdAt"
        FROM likes l
        WHERE l.user_id = $1
          AND l.entity IN ('post', 'ad')
      )
      UNION
      (
        SELECT
          b.entity_id AS id,
          b.entity::text AS type,
          b.created_at AS "createdAt"
        FROM bookmarks b
        WHERE b.user_id = $1
          AND b.entity IN ('post', 'ad')
      )
      ) t`,
      [userId],
    );

    const total = Number(totalRows[0]?.count || 0);
    return this.hydrateFeed(userId, rows, page, limit, total);
  }

  async getUsersFeed(
    userId: string,
    feedFilterDto: FeedFilterDto,
    authUserId?: string,
  ) {
    const page = Number(feedFilterDto.page) || 1;
    const limit = Number(feedFilterDto.limit) || 20;
    const offset = (page - 1) * limit;
    const canViewAllPosts = authUserId && authUserId === userId;

    const rows: RawFeedRow[] = await this.dataSource.query(
      `
      (
        SELECT
          p.id,
          'post' AS type,
          p.created_at AS "createdAt"
        FROM posts p
        WHERE p.owner_id = $3
          AND ($4::boolean = true OR p.is_public = true)
      )
      UNION ALL
      (
        SELECT
          a.id,
          'ad' AS type,
          a.created_at AS "createdAt"
        FROM ads a WHERE a.owner_id = $3
      )
      ORDER BY "createdAt" DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset, userId, canViewAllPosts],
    );
    const totalRows: Array<{ count: string }> = await this.dataSource.query(
      `SELECT COUNT(*) FROM (
  SELECT id FROM posts WHERE owner_id = $1 AND ($2::boolean = true OR is_public = true)
  UNION ALL
  SELECT id FROM ads WHERE owner_id = $1
) t`,
      [userId, canViewAllPosts],
    );

    const total = Number(totalRows[0]?.count || 0);
    return this.hydrateFeed(authUserId, rows, page, limit, total);
  }

  async getMyTaggedFeed(userId: string, feedFilterDto: FeedFilterDto) {
    const page = Number(feedFilterDto.page) || 1;
    const limit = Number(feedFilterDto.limit) || 20;
    const offset = (page - 1) * limit;

    const rows: RawFeedRow[] = await this.dataSource.query(
      `SELECT
          t.entity_id AS id,
          t.entity AS type,
          t.created_at AS "createdAt"
        FROM tags t
        WHERE t.user_id = $3
          AND t.entity IN ('post', 'ad')
          AND (
            t.entity <> 'post'
            OR EXISTS (
              SELECT 1
              FROM posts p
              WHERE p.id = t.entity_id::uuid
                AND p.is_public = true
            )
          )
      ORDER BY "createdAt" DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset, userId],
    );

    const totalRows: Array<{ count: string }> = await this.dataSource.query(
      `SELECT COUNT(*) FROM (SELECT
          t.entity_id AS id,
          t.entity AS type,
          t.created_at AS "createdAt"
        FROM tags t
        WHERE t.user_id = $1
          AND t.entity IN ('post', 'ad')
          AND (
            t.entity <> 'post'
            OR EXISTS (
              SELECT 1
              FROM posts p
              WHERE p.id = t.entity_id::uuid
                AND p.is_public = true
            )
          )
          ) t`,
      [userId],
    );

    const total = Number(totalRows[0]?.count || 0);
    return this.hydrateFeed(userId, rows, page, limit, total);
  }

  async getUsersTaggedFeed(
    userId: string,
    feedFilterDto: FeedFilterDto,
    authUserId?: string,
  ) {
    const page = Number(feedFilterDto.page) || 1;
    const limit = Number(feedFilterDto.limit) || 20;
    const offset = (page - 1) * limit;

    const rows: RawFeedRow[] = await this.dataSource.query(
      `SELECT
          t.entity_id AS id,
          t.entity AS type,
          t.created_at AS "createdAt"
        FROM tags t
        WHERE t.user_id = $3
          AND t.entity IN ('post', 'ad')
          AND (
            t.entity <> 'post'
            OR EXISTS (
              SELECT 1
              FROM posts p
              WHERE p.id = t.entity_id::uuid
                AND p.is_public = true
            )
          )
      ORDER BY "createdAt" DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset, userId],
    );

    const totalRows: Array<{ count: string }> = await this.dataSource.query(
      `SELECT COUNT(*) FROM (SELECT
          t.entity_id AS id,
          t.entity AS type,
          t.created_at AS "createdAt"
        FROM tags t
        WHERE t.user_id = $1
          AND t.entity IN ('post', 'ad')
          AND (
            t.entity <> 'post'
            OR EXISTS (
              SELECT 1
              FROM posts p
              WHERE p.id = t.entity_id::uuid
                AND p.is_public = true
            )
          )
          ) t`,
      [userId],
    );

    const total = Number(totalRows[0]?.count || 0);
    return this.hydrateFeed(authUserId, rows, page, limit, total);
  }
}
