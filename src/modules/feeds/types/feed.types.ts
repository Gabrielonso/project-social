import { FeedType } from '../enums/feed-type.enum';
import { UserDisplayDto } from '../../user/types/user-display.types';
import { FeedPoolSource } from '../feed-ranking.config';

export type RawFeedRow = {
  id: string;
  type: FeedType | 'repost';
  createdAt: Date;
  repostedById?: string;
  latestRepostAt?: Date;
};

export type FeedReposterDto = {
  id: string;
  username: string;
  profilePicture?: string;
};

export type ReposterRow = {
  post_id: string;
  user_id: string;
  created_at: Date;
};

export type SeenPostRow = {
  post_id: string;
  viewed_at: Date;
};

export type SeenPostMap = Map<string, Date>;

export type RepostsByPostId = Map<string, FeedReposterDto[]>;

export type RankedFeedCursor = {
  score: number;
  id: string;
  seed: string;
};

export type HydrateFeedOptions = {
  repostsByPostId?: RepostsByPostId;
  seenPostMap?: SeenPostMap;
  includeReposts?: boolean;
};

export type RankedFeedCandidate = {
  id: string;
  type: FeedType | 'repost';
  createdAt: Date;
  pool: FeedPoolSource;
  ownerId?: string;
  likeCount?: number;
  commentCount?: number;
  repostCount?: number;
  viewCount?: number;
  repostedById?: string;
  latestRepostAt?: Date;
  baseScore?: number;
  finalScore?: number;
};

export type PostCandidateRow = {
  id: string;
  type: string;
  createdAt: Date;
  ownerId?: string;
  likeCount?: number;
  commentCount?: number;
  repostCount?: number;
  viewCount?: number;
  latestRepostAt?: Date;
};

export type RepostRow = {
  post_id: string;
};

export type TagDto = {
  id: string;
  userId: string;
  type: string;
  startIndex?: number;
  endIndex?: number;
  createdAt: string;
};

export type EnrichedTagDto = TagDto & {
  user: UserDisplayDto;
};

export type TagRow = {
  entity: string;
  entity_id: string;
  id: string;
  user_id: string;
  type: string;
  start_index: number | null;
  end_index: number | null;
  created_at: string;
};

export type FollowPairRow = {
  follower_id: string;
  following_id: string;
};

export type LikeBookmarkRow = {
  entity: string;
  entity_id: string;
};

export type CachedBaseEntity = {
  id: string;
  ownerId?: string;
  tags?: TagDto[];
} & Record<string, unknown>;
