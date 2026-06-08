import { FeedType } from '../enums/feed-type.enum';
import { UserDisplayDto } from '../../user/types/user-display.types';

export type RawFeedRow = {
  id: string;
  type: FeedType | 'repost';
  createdAt: Date;
  repostedById?: string;
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
