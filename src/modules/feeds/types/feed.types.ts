import { FeedType } from '../enums/feed-type.enum';

export type RawFeedRow = {
  id: string;
  type: FeedType;
  createdAt: Date;
};
