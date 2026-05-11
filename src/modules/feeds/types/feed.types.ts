import { FeedType } from '../enums/feed-type.enum';

export type RawFeedRow = {
  id: string;
  type: FeedType;
  createdAt: Date;
};

export type TagDto = {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  type: string;
  startIndex?: number;
  endIndex?: number;
  createdAt: string;
};

export type TagRow = {
  entity: string;
  entity_id: string;
  id: string;
  user_id: string;
  username: string;
  user_avatar: string | null;
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
