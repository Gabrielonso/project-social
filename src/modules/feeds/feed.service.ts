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

    return this.hydrateFeed(userId, rows, page, limit);
  }

  private async hydrateFeed(
    viewerId: string,
    rows: RawFeedRow[],
    page: number,
    limit: number,
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
          .select(['post', 'medias'])
          .leftJoinAndSelect('medias.media', 'media')
          .where('post.id IN (:...ids)', { ids: postIds })
          .getMany()
      : [];

    // Fetch ads (simple)
    const ads = adIds.length
      ? await this.adRepo
          .createQueryBuilder('ad')
          .leftJoinAndSelect('ad.medias', 'medias')
          .select(['ad', 'medias'])
          .leftJoinAndSelect('medias.media', 'media')
          .where('ad.id IN (:...ids)', { ids: adIds })
          .getMany()
      : [];

    const likes = await this.dataSource.query(
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
    );

    const likedSet = new Set(likes.map((l) => `${l.entity}:${l.entity_id}`));

    // Map for fast lookup
    const postMap = new Map(
      posts.map((p) => [
        p.id,
        { ...p, viewerHasLiked: likedSet.has(`${FeedType.POST}:${p.id}`) },
      ]),
    );
    const adMap = new Map(
      ads.map((a) => [
        a.id,
        { ...a, viewerHasLiked: likedSet.has(`${FeedType.AD}:${a.id}`) },
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
      totalPages: Math.ceil(feed.length / limit),
    });
  }
}
