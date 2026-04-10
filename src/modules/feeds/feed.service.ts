import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { successResponse } from 'src/common/helpers/response.helper';
import { InjectRepository } from '@nestjs/typeorm';
import { FeedFilterDto } from './dtos/feed-filter.dto';
import { RawFeedRow } from './types/feed.types';
import { Ad } from 'src/modules/ads/entities/ads.entity';
import { Post } from 'src/modules/posts/entities/post.entity';
import { FeedType } from './enums/feed-type.enum';

@Injectable()
export class FeedService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Post)
    private postRepo: Repository<Post>,
    @InjectRepository(Ad)
    private adRepo: Repository<Ad>,
  ) {}

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

    // Fetch posts exactly how you already do
    const posts = postIds.length
      ? await this.postRepo
          .createQueryBuilder('post')
          .leftJoinAndSelect('post.medias', 'medias')
          .leftJoinAndSelect('post.sound', 'sound')
          .select(['post', 'medias', 'sound'])
          .leftJoinAndSelect('medias.media', 'media')
          .where('post.id IN (:...ids)', { ids: postIds })
          .getMany()
      : [];

    // Fetch ads (simple)
    const ads = adIds.length
      ? await this.adRepo
          .createQueryBuilder('ad')
          .leftJoinAndSelect('ad.medias', 'medias')
          .leftJoinAndSelect('ad.sound', 'sound')
          .select(['ad', 'medias', 'sound'])
          .leftJoinAndSelect('medias.media', 'media')
          .where('ad.id IN (:...ids)', { ids: adIds })
          .getMany()
      : [];

    const likes = viewerId
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

    const bookmarks = viewerId
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

    const allTags =
      postIds.length || adIds.length
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
            [postIds.length ? postIds : [null], adIds.length ? adIds : [null]],
          )
        : [];

    const tagMap = new Map<string, any[]>();

    for (const tag of allTags) {
      const key = `${tag.entity}:${tag.entity_id}`;

      if (!tagMap.has(key)) {
        tagMap.set(key, []);
      }

      tagMap.get(key)!.push({
        id: tag.id,
        userId: tag.user_id,
        username: tag.username,
        userAvatar: tag.user_avatar,
        type: tag.type,
        startIndex: tag.start_index,
        endIndex: tag.end_index,
        createdAt: tag.created_at,
      });
    }

    const likedSet = new Set(likes?.map((l) => `${l?.entity}:${l?.entity_id}`));

    const bookmarkedSet = new Set(
      bookmarks?.map((l) => `${l?.entity}:${l?.entity_id}`),
    );

    // Map for fast lookup
    const postMap = new Map(
      posts.map((p) => [
        p.id,
        {
          ...p,
          viewerHasLiked: likedSet.has(`${FeedType.POST}:${p.id}`),
          viewerHasBookmarked: bookmarkedSet.has(`${FeedType.POST}:${p.id}`),
          tags: tagMap.get(`${FeedType.POST}:${p.id}`) || [],
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
          tags: tagMap.get(`${FeedType.AD}:${a.id}`) || [],
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
    const page = Number(feedFilterDto.page) || 1;
    const limit = Number(feedFilterDto.limit) || 20;
    const offset = (page - 1) * limit;

    const rows = await this.dataSource.query(
      `
      (
        SELECT
          p.id,
          'post' AS type,
          p.created_at AS "createdAt"
        FROM posts p
        WHERE p.is_public = true
      )
      UNION ALL
      (
        SELECT
          a.id,
          'ad' AS type,
          a.created_at AS "createdAt"
        FROM ads a
      )
      ORDER BY "createdAt" DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset],
    );

    const total = await this.dataSource.query(
      `SELECT COUNT(*) FROM (
  SELECT id FROM posts WHERE is_public = true
  UNION ALL
  SELECT id FROM ads
) t`,
    );

    return this.hydrateFeed(userId, rows, page, limit, total[0]?.count);
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

    const total = await this.dataSource.query(
      `SELECT COUNT(*) FROM (
  SELECT id FROM posts WHERE owner_id = $1
  UNION ALL
  SELECT id FROM ads WHERE owner_id = $1
) t`,
      [userId],
    );

    return this.hydrateFeed(userId, rows, page, limit, total[0]?.count);
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
    const total = await this.dataSource.query(
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

    return this.hydrateFeed(userId, rows, page, limit, total[0]?.count);
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
    const total = await this.dataSource.query(
      `SELECT COUNT(*) FROM (
  SELECT id FROM posts WHERE owner_id = $1 AND ($2::boolean = true OR is_public = true)
  UNION ALL
  SELECT id FROM ads WHERE owner_id = $1
) t`,
      [userId, canViewAllPosts],
    );

    return this.hydrateFeed(authUserId, rows, page, limit, total[0]?.count);
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
              WHERE p.id = t.entity_id
                AND p.is_public = true
            )
          )
      ORDER BY "createdAt" DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset, userId],
    );

    const total = await this.dataSource.query(
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
              WHERE p.id = t.entity_id
                AND p.is_public = true
            )
          )
          ) t`,
      [userId],
    );

    return this.hydrateFeed(userId, rows, page, limit, total[0]?.count);
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
              WHERE p.id = t.entity_id
                AND p.is_public = true
            )
          )
      ORDER BY "createdAt" DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset, userId],
    );

    const total = await this.dataSource.query(
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
              WHERE p.id = t.entity_id
                AND p.is_public = true
            )
          )
          ) t`,
      [userId],
    );

    return this.hydrateFeed(authUserId, rows, page, limit, total[0]?.count);
  }
}
