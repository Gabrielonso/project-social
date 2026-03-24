import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { successResponse } from 'src/common/helpers/response.helper';
import { FeedService } from '../feeds/feed.service';
import { SoundFilterDto } from './dtos/sound-filter.dto';
import { RawFeedRow } from '../feeds/types/feed.types';

@Injectable()
export class SoundsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly feedService: FeedService,
  ) {}

  async getSounds(filter: SoundFilterDto) {
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 20;
    const offset = (page - 1) * limit;

    const { startDate, endDate } = filter;

    const params: any[] = [];
    let idx = 1;

    let postDateFilter = '';
    let adDateFilter = '';
    if (startDate) {
      postDateFilter += ` AND p.created_at >= $${idx}`;
      adDateFilter += ` AND a.created_at >= $${idx}`;
      params.push(startDate);
      idx++;
    }
    if (endDate) {
      postDateFilter += ` AND p.created_at <= $${idx}`;
      adDateFilter += ` AND a.created_at <= $${idx}`;
      params.push(endDate);
      idx++;
    }

    params.push(limit, offset);

    const sounds = await this.dataSource.query(
      `
      WITH sound_usage AS (
        SELECT p.sound_media_id AS media_id, p.created_at
        FROM posts p
        WHERE p.sound_media_id IS NOT NULL ${postDateFilter}
        UNION ALL
        SELECT a.sound_media_id AS media_id, a.created_at
        FROM ads a
        WHERE a.sound_media_id IS NOT NULL ${adDateFilter}
      )
      SELECT
        m.id,
        m.original_url AS "originalUrl",
        m.stream_url AS "streamUrl",
        COUNT(su.media_id)::int AS "usageCount",
        MAX(su.created_at) AS "lastUsedAt"
      FROM sound_usage su
      JOIN medias m ON m.id = su.media_id
      GROUP BY m.id
      ORDER BY "usageCount" DESC, "lastUsedAt" DESC
      LIMIT $${idx++} OFFSET $${idx}
      `,
      params,
    );

    return successResponse('Operation Successful', {
      data: sounds,
      currentPage: page,
      totalPages: sounds.length < limit ? page : page + 1,
    });
  }

  async getTrendingSounds(filter: SoundFilterDto) {
    // For now, same as getSounds but can be specialized later.
    return this.getSounds(filter);
  }

  async getSoundUsage(
    soundId: string,
    viewerId: string | undefined,
    filter: SoundFilterDto,
  ) {
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 20;
    const offset = (page - 1) * limit;

    const rows: RawFeedRow[] = await this.dataSource.query(
      `
      (
        SELECT
          p.id,
          'post' AS type,
          p.created_at AS "createdAt"
        FROM posts p
        WHERE p.sound_media_id = $3
      )
      UNION ALL
      (
        SELECT
          a.id,
          'ad' AS type,
          a.created_at AS "createdAt"
        FROM ads a
        WHERE a.sound_media_id = $3
      )
      ORDER BY "createdAt" DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset, soundId],
    );

    const total = await this.dataSource.query(
      `SELECT COUNT(*) FROM ((
        SELECT
          p.id,
          'post' AS type,
          p.created_at AS "createdAt"
        FROM posts p
        WHERE p.sound_media_id = $1
      )
      UNION ALL
      (
        SELECT
          a.id,
          'ad' AS type,
          a.created_at AS "createdAt"
        FROM ads a
        WHERE a.sound_media_id = $1
      )
      ) t`,
      [soundId],
    );

    return this.feedService.hydrateFeed(
      viewerId,
      rows,
      page,
      limit,
      total[0]?.count,
    );
  }
}
