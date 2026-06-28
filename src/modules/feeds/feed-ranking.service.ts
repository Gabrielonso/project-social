import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { FeedType } from './enums/feed-type.enum';
import {
  FEED_RANKING,
  FEED_SLOT_TEMPLATE,
  FeedPoolSource,
} from './feed-ranking.config';
import {
  RankedFeedCandidate,
  RankedFeedCursor,
  SeenPostMap,
} from './types/feed.types';

export type ScoreContext = {
  followingIds: Set<string>;
  seenMap: SeenPostMap;
  viewerId: string;
};

@Injectable()
export class FeedRankingService {
  generateSeed(existing?: string): string {
    if (existing) return existing;
    return randomBytes(16).toString('hex');
  }

  encodeRankedCursor(input: RankedFeedCursor): string {
    return Buffer.from(JSON.stringify(input), 'utf8').toString('base64');
  }

  decodeRankedCursor(cursor?: string): RankedFeedCursor | null {
    if (!cursor) return null;
    try {
      const raw = Buffer.from(cursor, 'base64').toString('utf8');
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      const obj = parsed as Record<string, unknown>;
      if (
        typeof obj.score !== 'number' ||
        typeof obj.id !== 'string' ||
        typeof obj.seed !== 'string'
      ) {
        return null;
      }
      return { score: obj.score, id: obj.id, seed: obj.seed };
    } catch {
      return null;
    }
  }

  hashToUnitInterval(seed: string, candidateId: string): number {
    const hash = createHash('sha256')
      .update(`${seed}:${candidateId}`)
      .digest();
    return hash.readUInt32BE(0) / 0xffffffff;
  }

  recencyDecay(hoursSince: number, halfLifeHours: number): number {
    if (hoursSince <= 0) return 1;
    return Math.exp(-hoursSince / halfLifeHours);
  }

  computeSeenMultiplier(
    pool: FeedPoolSource | 'ad',
    viewedAt?: Date,
    latestRepostAt?: Date,
  ): number {
    if (!viewedAt || pool === 'ad') return 1;

    const hoursSinceView =
      (Date.now() - new Date(viewedAt).getTime()) / (1000 * 60 * 60);
    const decay = Math.exp(-hoursSinceView / FEED_RANKING.SEEN_DECAY_HOURS);

    let minPenalty: number;
    if (pool === 'discovery') {
      minPenalty = FEED_RANKING.SEEN_PENALTY_DISCOVERY_MIN;
    } else if (pool === 'following') {
      minPenalty = FEED_RANKING.SEEN_PENALTY_FOLLOWING;
    } else if (pool === 'repost') {
      if (
        latestRepostAt &&
        new Date(latestRepostAt).getTime() > new Date(viewedAt).getTime()
      ) {
        return 1;
      }
      minPenalty = FEED_RANKING.SEEN_PENALTY_REPOST_STALE;
    } else {
      return 1;
    }

    return minPenalty + (1 - minPenalty) * decay;
  }

  /** Recent own posts/ads score normally; older own content gets an extra downrank. */
  computeOwnContentMultiplier(
    ownerId: string | undefined,
    viewerId: string,
    hoursSinceCreated: number,
  ): number {
    if (!ownerId || ownerId !== viewerId) return 1;
    if (hoursSinceCreated <= FEED_RANKING.OWN_CONTENT_GRACE_HOURS) return 1;

    const excessHours =
      hoursSinceCreated - FEED_RANKING.OWN_CONTENT_GRACE_HOURS;
    const decay = Math.exp(
      -excessHours / FEED_RANKING.OWN_CONTENT_EXTRA_DECAY_HOURS,
    );
    return (
      FEED_RANKING.OWN_CONTENT_OLD_MIN +
      (1 - FEED_RANKING.OWN_CONTENT_OLD_MIN) * decay
    );
  }

  scoreCandidate(candidate: RankedFeedCandidate, ctx: ScoreContext): number {
    const now = Date.now();
    const createdAt = new Date(candidate.createdAt).getTime();
    const hoursSincePost = Math.max(0, (now - createdAt) / (1000 * 60 * 60));

    const engagement = Math.log1p(
      (candidate.likeCount ?? 0) +
        2 * (candidate.commentCount ?? 0) +
        3 * (candidate.repostCount ?? 0),
    );

    const isFromFollowing =
      candidate.ownerId != null && ctx.followingIds.has(candidate.ownerId);
    const isFollowedRepost = candidate.pool === 'repost';

    let baseScore =
      FEED_RANKING.WEIGHT_RECENCY *
        this.recencyDecay(
          hoursSincePost,
          FEED_RANKING.RECENCY_HALF_LIFE_HOURS,
        ) +
      FEED_RANKING.WEIGHT_ENGAGEMENT * engagement +
      (isFromFollowing ? FEED_RANKING.WEIGHT_FOLLOWING : 0) +
      (isFollowedRepost ? FEED_RANKING.WEIGHT_FOLLOWED_REPOST : 0) +
      FEED_RANKING.WEIGHT_VIEWS * Math.log1p(candidate.viewCount ?? 0);

    const viewedAt = ctx.seenMap.get(candidate.id);
    const seenMultiplier = this.computeSeenMultiplier(
      candidate.pool,
      viewedAt,
      candidate.latestRepostAt,
    );

    const ownMultiplier = this.computeOwnContentMultiplier(
      candidate.ownerId,
      ctx.viewerId,
      hoursSincePost,
    );

    return baseScore * seenMultiplier * ownMultiplier;
  }

  applyJitter(
    candidates: RankedFeedCandidate[],
    seed: string,
  ): RankedFeedCandidate[] {
    return candidates.map((c) => {
      const baseScore = c.baseScore ?? 0;
      const jitter =
        this.hashToUnitInterval(seed, c.id) *
        FEED_RANKING.JITTER_MAX *
        Math.max(baseScore, 0.01);
      return { ...c, finalScore: baseScore + jitter };
    });
  }

  rankPool(
    candidates: RankedFeedCandidate[],
    ctx: ScoreContext,
    seed: string,
  ): RankedFeedCandidate[] {
    const scored = candidates.map((c) => ({
      ...c,
      baseScore: this.scoreCandidate(c, ctx),
    }));
    const jittered = this.applyJitter(scored, seed);
    return jittered.sort((a, b) => {
      const scoreDiff = (b.finalScore ?? 0) - (a.finalScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return b.id.localeCompare(a.id);
    });
  }

  isBeforeCursor(
    candidate: RankedFeedCandidate,
    cursor: RankedFeedCursor,
  ): boolean {
    const score = candidate.finalScore ?? 0;
    if (score < cursor.score) return true;
    if (score > cursor.score) return false;
    return candidate.id < cursor.id;
  }

  mergeBySlots(
    pools: Record<FeedPoolSource, RankedFeedCandidate[]>,
    limit: number,
    cursor?: RankedFeedCursor | null,
  ): RankedFeedCandidate[] {
    const indices: Record<FeedPoolSource, number> = {
      following: 0,
      discovery: 0,
      repost: 0,
      ad: 0,
    };

    const seenPostIds = new Set<string>();
    const result: RankedFeedCandidate[] = [];

    const takeFromPool = (pool: FeedPoolSource): RankedFeedCandidate | null => {
      const list = pools[pool];
      while (indices[pool] < list.length) {
        const candidate = list[indices[pool]++];
        if (cursor && !this.isBeforeCursor(candidate, cursor)) continue;

        const isPost =
          candidate.type === FeedType.POST || candidate.type === 'repost';
        if (isPost && seenPostIds.has(candidate.id)) continue;

        return candidate;
      }
      return null;
    };

    const resolveDedup = (
      candidate: RankedFeedCandidate,
      slot: FeedPoolSource,
    ): boolean => {
      const isPost =
        candidate.type === FeedType.POST || candidate.type === 'repost';
      if (!isPost) return true;

      const existingIdx = result.findIndex(
        (r) =>
          (r.type === FeedType.POST || r.type === 'repost') &&
          r.id === candidate.id,
      );

      if (existingIdx === -1) {
        seenPostIds.add(candidate.id);
        return true;
      }

      const existing = result[existingIdx];

      if (slot === 'following' && existing.pool === 'repost') {
        result[existingIdx] = candidate;
        return false;
      }

      if (slot === 'repost' && existing.pool === 'following') {
        return false;
      }

      if (slot === 'repost' && existing.pool === 'discovery') {
        result[existingIdx] = candidate;
        return false;
      }

      return false;
    };

    let slotIdx = 0;
    let safety = 0;
    const maxIterations = limit * FEED_SLOT_TEMPLATE.length * 2;

    while (result.length < limit && safety < maxIterations) {
      safety++;
      const slot = FEED_SLOT_TEMPLATE[slotIdx % FEED_SLOT_TEMPLATE.length];
      slotIdx++;

      let candidate = takeFromPool(slot);

      if (!candidate && slot !== 'discovery') {
        candidate = takeFromPool('discovery');
      }

      if (!candidate) break;

      if (resolveDedup(candidate, slot)) {
        result.push(candidate);
      }
    }

    return result;
  }

  toRawFeedRows(candidates: RankedFeedCandidate[]) {
    return candidates.map((c) => ({
      id: c.id,
      type: c.type,
      createdAt: c.createdAt,
      repostedById: c.repostedById,
      latestRepostAt: c.latestRepostAt,
    }));
  }
}
