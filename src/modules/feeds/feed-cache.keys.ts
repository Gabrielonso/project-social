import { FeedType } from './enums/feed-type.enum';

/** Shared Redis keys for feed hydration cache (must stay in sync everywhere). */
export function feedBaseKey(type: FeedType, id: string): string {
  return `feed:base:${type}:${id}`;
}

export function feedTagsKey(type: FeedType, id: string): string {
  return `feed:tags:${type}:${id}`;
}

/** Prefix for short-lived full public feed responses in `getFeed()`. */
export const PUBLIC_FEED_LIST_CACHE_PREFIX = 'feed:v2:public:';

export function publicFeedListCacheKey(params: {
  viewerKey: string;
  limit: number;
  cursorToken: string;
}): string {
  return `${PUBLIC_FEED_LIST_CACHE_PREFIX}${params.viewerKey}:${params.limit}:${params.cursorToken}`;
}
