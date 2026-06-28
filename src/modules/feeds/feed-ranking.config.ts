export const FEED_RANKING = {
  WEIGHT_RECENCY: 2.0,
  WEIGHT_ENGAGEMENT: 1.0,
  WEIGHT_FOLLOWING: 3.0,
  WEIGHT_FOLLOWED_REPOST: 2.5,
  WEIGHT_VIEWS: 0.5,
  RECENCY_HALF_LIFE_HOURS: 48,
  JITTER_MAX: 0.15,
  OVERFETCH_MULTIPLIER: 3,
  REPOST_MAX_AGE_DAYS: 7,
  REPOSTS_DISPLAY_CAP: 5,
  SEEN_PENALTY_DISCOVERY_MIN: 0.3,
  SEEN_PENALTY_FOLLOWING: 0.7,
  SEEN_PENALTY_REPOST_STALE: 0.6,
  SEEN_DECAY_HOURS: 168,
  /** Own posts/ads at full strength within this age (same as any fresh content). */
  OWN_CONTENT_GRACE_HOURS: 48,
  /** Floor multiplier for older own posts/ads after grace period. */
  OWN_CONTENT_OLD_MIN: 0.25,
  /** How quickly own content beyond grace fades toward OWN_CONTENT_OLD_MIN. */
  OWN_CONTENT_EXTRA_DECAY_HOURS: 120,
} as const;

/** Slot source per position in a page (repeating pattern for pages > template length). */
export const FEED_SLOT_TEMPLATE = [
  'following',
  'discovery',
  'repost',
  'following',
  'ad',
  'discovery',
  'following',
  'repost',
  'discovery',
  'following',
  'ad',
  'discovery',
  'following',
  'repost',
  'discovery',
  'following',
  'discovery',
  'repost',
  'discovery',
  'following',
] as const;

export type FeedPoolSource = (typeof FEED_SLOT_TEMPLATE)[number];
