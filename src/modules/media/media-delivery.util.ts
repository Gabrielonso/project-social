import { Media } from './entities/media.entity';
import { MediaStatus } from './enums/media-status.enum';
import { ModerationStatus } from './enums/moderation-status.enum';

/** S3 object confirmed and past the client upload step. */
export function hasDeliverableUpload(media: Media): boolean {
  return (
    media.status !== MediaStatus.UPLOADING &&
    media.status !== MediaStatus.REJECTED &&
    !!media.sourceIdOrKey
  );
}

export function isModerationCleared(media: Media): boolean {
  if (media.moderationStatus === ModerationStatus.PASSED) {
    return true;
  }
  if (media.moderationStatus === ModerationStatus.SKIPPED) {
    return true;
  }
  if (media.status === MediaStatus.READY && !media.moderationStatus) {
    return true;
  }
  return false;
}

export function isModerationRejected(media: Media): boolean {
  return (
    media.status === MediaStatus.REJECTED ||
    media.moderationStatus === ModerationStatus.REJECTED
  );
}

/** Moderation infrastructure failure — blocks publication. */
export function isModerationFailed(media: Media): boolean {
  return media.status === MediaStatus.FAILED && !isModerationCleared(media);
}

export function isPubliclyDeliverable(media: Media): boolean {
  if (!hasDeliverableUpload(media)) {
    return false;
  }
  if (isModerationRejected(media)) {
    return false;
  }
  if (isModerationFailed(media)) {
    return false;
  }
  return isModerationCleared(media);
}

export function isAwaitingModeration(media: Media): boolean {
  if (media.status === MediaStatus.UPLOADING) {
    return false;
  }
  if (isModerationRejected(media) || isModerationFailed(media)) {
    return false;
  }
  return !isModerationCleared(media);
}

/** Transcode errors must not surface as terminal `failed` when moderation already passed. */
export function effectiveMediaStatus(media: Media): MediaStatus {
  if (media.status === MediaStatus.FAILED && isModerationCleared(media)) {
    return MediaStatus.PROCESSING;
  }
  return media.status;
}
