import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { successResponse } from 'src/common/helpers/response.helper';
import { FeedService } from '../feeds/feed.service';
import { TrendQueryDto } from './dtos/trend-query.dto';
import { RawFeedRow } from '../feeds/types/feed.types';

type TrendRow = {
  tag: string;
  postCount: number;
  lastUsedAt: Date;
};

const TREND_CATEGORIES: {
  [key: string]: { label: string; description: string; keywords: string[] };
} = {
  sports: {
    label: 'Sports',
    description: 'Trends related to sports, teams, and competitions',
    keywords: ['sport', 'football', 'soccer', 'nba', 'nfl', 'fifa', 'tennis'],
  },
  movies: {
    label: 'Movies',
    description: 'Trends about films, actors, and cinema',
    keywords: [
      'movie',
      'film',
      'cinema',
      'hollywood',
      'bollywood',
      'nollywood',
    ],
  },
  tech: {
    label: 'Tech',
    description: 'Technology, startups, gadgets, and programming',
    keywords: ['tech', 'startup', 'ai', 'code', 'dev', 'javascript', 'python'],
  },
  entertainment: {
    label: 'Entertainment',
    description: 'General entertainment, music, shows, and celebrities',
    keywords: ['music', 'song', 'show', 'concert', 'celebrity', 'entertain'],
  },
};

@Injectable()
export class TrendsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly feedService: FeedService,
  ) {}

  async getTrends(query: TrendQueryDto) {
    const limit = Number(query.limit) || 20;
    const trends = await this.getAllTrends(limit);
    return successResponse('Operation Successful', trends);
  }

  async getCategories() {
    const categories = Object.entries(TREND_CATEGORIES).map(([key, value]) => ({
      key,
      label: value.label,
      description: value.description,
    }));

    return successResponse('Operation Successful', categories);
  }

  async getTrendsByCategory(category: string, query: TrendQueryDto) {
    const key = category.toLowerCase();
    const config = TREND_CATEGORIES[key];
    if (!config) {
      return successResponse('Operation Successful', []);
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const offset = (page - 1) * limit;

    const all = await this.getAllTrends(500); // reasonable upper bound
    const lowerKeywords = config.keywords.map((k) => k.toLowerCase());

    const filtered = all.filter((t) => {
      const tag = t.tag?.toLowerCase() || '';
      return lowerKeywords.some((kw) => tag.includes(kw));
    });

    const paged = filtered.slice(offset, offset + limit);

    return successResponse('Operation Successful', {
      data: paged,
      currentPage: page,
      totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
    });
  }

  private async getAllTrends(limit: number): Promise<TrendRow[]> {
    return this.dataSource.query(
      `
      WITH tags AS (
        SELECT unnest(COALESCE(p.hashtags, ARRAY[]::text[])) AS tag, p.created_at AS created_at
        FROM posts p
        WHERE p.is_public = true
        UNION ALL
        SELECT unnest(COALESCE(a.hashtags, ARRAY[]::text[])) AS tag, a.created_at AS created_at
        FROM ads a
      )
      SELECT
        tag,
        COUNT(*)::int AS "postCount",
        MAX(created_at) AS "lastUsedAt"
      FROM tags
      WHERE tag IS NOT NULL AND tag <> ''
      GROUP BY tag
      ORDER BY "postCount" DESC, "lastUsedAt" DESC
      LIMIT $1
      `,
      [limit],
    );
  }

  async getTrendFeed(tag: string, viewerId: string, query: TrendQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const offset = (page - 1) * limit;

    const rows: RawFeedRow[] = await this.dataSource.query(
      `
      (
        SELECT
          p.id,
          'post' AS type,
          p.created_at AS "createdAt"
        FROM posts p
        WHERE $3 = ANY(COALESCE(p.hashtags, ARRAY[]::text[]))
          AND p.is_public = true
      )
      UNION ALL
      (
        SELECT
          a.id,
          'ad' AS type,
          a.created_at AS "createdAt"
        FROM ads a
        WHERE $3 = ANY(COALESCE(a.hashtags, ARRAY[]::text[]))
      )
      ORDER BY "createdAt" DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset, tag],
    );

    const total = await this.dataSource.query(
      `SELECT COUNT(*) FROM ((
        SELECT
          p.id,
          'post' AS type,
          p.created_at AS "createdAt"
        FROM posts p
        WHERE $1 = ANY(COALESCE(p.hashtags, ARRAY[]::text[]))
          AND p.is_public = true
      )
      UNION ALL
      (
        SELECT
          a.id,
          'ad' AS type,
          a.created_at AS "createdAt"
        FROM ads a
        WHERE $1 = ANY(COALESCE(a.hashtags, ARRAY[]::text[]))
      )
      ) t`,
      [tag],
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
