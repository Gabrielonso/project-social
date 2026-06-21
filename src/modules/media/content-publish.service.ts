import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Media } from './entities/media.entity';
import { MediaStatus } from './enums/media-status.enum';
import { ContentPublishStatus } from './enums/content-publish-status.enum';
import { Post } from '../posts/entities/post.entity';
import { PostMedia } from '../posts/entities/post-media.entity';
import { Ad } from '../ads/entities/ads.entity';
import { AdMedia } from '../ads/entities/ads-media.entity';
import { Status } from '../status/entities/status.entity';
import { Tag } from '../engagements/entities/tag.entity';
import { User } from '../user/entity/user.entity';
import { FeedType } from '../feeds/enums/feed-type.enum';
import { FeedCacheInvalidationService } from '../feeds/feed-cache-invalidation.service';
import { NotificationDispatcher } from '../notification/notification.dispatcher';
import { TagType } from '../engagements/enums/tag-type.enum';
import { WsGateway } from 'src/realtime/gateway/ws.gateway';

const STATUS_LIVE_HOURS = 24;
const PENDING_STATUS_EXPIRY_HOURS = 24 * 7;

@Injectable()
export class ContentPublishService {
  private readonly logger = new Logger(ContentPublishService.name);

  constructor(
    @InjectRepository(Media)
    private readonly mediaRepo: Repository<Media>,
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(PostMedia)
    private readonly postMediaRepo: Repository<PostMedia>,
    @InjectRepository(Ad)
    private readonly adRepo: Repository<Ad>,
    @InjectRepository(AdMedia)
    private readonly adMediaRepo: Repository<AdMedia>,
    @InjectRepository(Status)
    private readonly statusRepo: Repository<Status>,
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly feedCacheInvalidation: FeedCacheInvalidationService,
    private readonly notificationDispatcher: NotificationDispatcher,
    @Inject(forwardRef(() => WsGateway))
    private readonly wsGateway: WsGateway,
  ) {}

  async onMediaTerminalUpdate(mediaId: string): Promise<void> {
    const media = await this.mediaRepo.findOne({ where: { id: mediaId } });
    if (!media) {
      return;
    }

    const postIds = await this.findPendingPostIdsForMedia(mediaId);
    const adIds = await this.findPendingAdIdsForMedia(mediaId);
    const statusIds = await this.findPendingStatusIdsForMedia(mediaId);

    for (const postId of postIds) {
      await this.evaluatePost(postId);
    }
    for (const adId of adIds) {
      await this.evaluateAd(adId);
    }
    for (const statusId of statusIds) {
      await this.evaluateStatus(statusId);
    }
  }

  private async findPendingPostIdsForMedia(mediaId: string): Promise<string[]> {
    const fromMedias = await this.postMediaRepo
      .createQueryBuilder('pm')
      .innerJoin('pm.post', 'post')
      .select('post.id', 'id')
      .where('pm.mediaId = :mediaId', { mediaId })
      .andWhere('post.publishStatus = :pending', {
        pending: ContentPublishStatus.PENDING,
      })
      .getRawMany<{ id: string }>();

    const fromSound = await this.postRepo
      .createQueryBuilder('post')
      .select('post.id', 'id')
      .where('post.sound_media_id = :mediaId', { mediaId })
      .andWhere('post.publishStatus = :pending', {
        pending: ContentPublishStatus.PENDING,
      })
      .getRawMany<{ id: string }>();

    return [...new Set([...fromMedias, ...fromSound].map((row) => row.id))];
  }

  private async findPendingAdIdsForMedia(mediaId: string): Promise<string[]> {
    const fromMedias = await this.adMediaRepo
      .createQueryBuilder('am')
      .innerJoin('am.ad', 'ad')
      .select('ad.id', 'id')
      .where('am.mediaId = :mediaId', { mediaId })
      .andWhere('ad.publishStatus = :pending', {
        pending: ContentPublishStatus.PENDING,
      })
      .getRawMany<{ id: string }>();

    const fromSound = await this.adRepo
      .createQueryBuilder('ad')
      .select('ad.id', 'id')
      .where('ad.sound_media_id = :mediaId', { mediaId })
      .andWhere('ad.publishStatus = :pending', {
        pending: ContentPublishStatus.PENDING,
      })
      .getRawMany<{ id: string }>();

    return [...new Set([...fromMedias, ...fromSound].map((row) => row.id))];
  }

  private async findPendingStatusIdsForMedia(
    mediaId: string,
  ): Promise<string[]> {
    const rows = await this.statusRepo
      .createQueryBuilder('status')
      .select('status.id', 'id')
      .where('status.mediaId = :mediaId', { mediaId })
      .andWhere('status.publishStatus = :pending', {
        pending: ContentPublishStatus.PENDING,
      })
      .getRawMany<{ id: string }>();

    return rows.map((row) => row.id);
  }

  private async evaluatePost(postId: string): Promise<void> {
    const post = await this.postRepo.findOne({
      where: { id: postId },
      relations: { medias: { media: true }, sound: true },
    });
    if (!post || post.publishStatus !== ContentPublishStatus.PENDING) {
      return;
    }

    const linkedMedia = [
      ...post.medias.map((pm) => pm.media),
      ...(post.sound ? [post.sound] : []),
    ];
    const outcome = this.resolveOutcome(linkedMedia);
    if (outcome === 'pending') {
      return;
    }

    if (outcome === 'failed') {
      await this.postRepo.update(postId, {
        publishStatus: ContentPublishStatus.FAILED,
      });
      this.emitFailed('post.failed', post.ownerId, {
        postId,
        publishStatus: ContentPublishStatus.FAILED,
        rejectionReason: this.firstRejectionReason(linkedMedia),
      });
      return;
    }

    await this.postRepo.update(postId, {
      publishStatus: ContentPublishStatus.PUBLISHED,
    });
    await this.notifyPostTagsOnPublish(post);
    await this.safeInvalidate(() =>
      this.feedCacheInvalidation.invalidatePostAndPublicList(postId),
    );
    this.emitPublished('post.published', post.ownerId, {
      postId,
      publishStatus: ContentPublishStatus.PUBLISHED,
    });
  }

  private async evaluateAd(adId: string): Promise<void> {
    const ad = await this.adRepo.findOne({
      where: { id: adId },
      relations: { medias: { media: true }, sound: true },
    });
    if (!ad || ad.publishStatus !== ContentPublishStatus.PENDING) {
      return;
    }

    const linkedMedia = [
      ...ad.medias.map((am) => am.media),
      ...(ad.sound ? [ad.sound] : []),
    ];
    const outcome = this.resolveOutcome(linkedMedia);
    if (outcome === 'pending') {
      return;
    }

    if (outcome === 'failed') {
      await this.adRepo.update(adId, {
        publishStatus: ContentPublishStatus.FAILED,
      });
      this.emitFailed('ad.failed', ad.ownerId, {
        adId,
        publishStatus: ContentPublishStatus.FAILED,
        rejectionReason: this.firstRejectionReason(linkedMedia),
      });
      return;
    }

    await this.adRepo.update(adId, {
      publishStatus: ContentPublishStatus.PUBLISHED,
    });
    await this.safeInvalidate(() =>
      this.feedCacheInvalidation.invalidateAdAndPublicList(adId),
    );
    this.emitPublished('ad.published', ad.ownerId, {
      adId,
      publishStatus: ContentPublishStatus.PUBLISHED,
    });
  }

  private async evaluateStatus(statusId: string): Promise<void> {
    const status = await this.statusRepo.findOne({
      where: { id: statusId },
      relations: { media: true },
    });
    if (!status || status.publishStatus !== ContentPublishStatus.PENDING) {
      return;
    }

    const linkedMedia = status.media ? [status.media] : [];
    const outcome = this.resolveOutcome(linkedMedia);
    if (outcome === 'pending') {
      return;
    }

    if (outcome === 'failed') {
      await this.statusRepo.update(statusId, {
        publishStatus: ContentPublishStatus.FAILED,
      });
      this.emitFailed('status.failed', status.ownerId, {
        statusId,
        publishStatus: ContentPublishStatus.FAILED,
        rejectionReason: this.firstRejectionReason(linkedMedia),
      });
      return;
    }

    await this.statusRepo.update(statusId, {
      publishStatus: ContentPublishStatus.PUBLISHED,
      expiresAt: this.getExpiryDate(STATUS_LIVE_HOURS),
    });
    this.emitPublished('status.published', status.ownerId, {
      statusId,
      publishStatus: ContentPublishStatus.PUBLISHED,
    });
  }

  private resolveOutcome(
    linkedMedia: Media[],
  ): 'pending' | 'published' | 'failed' {
    if (linkedMedia.length === 0) {
      return 'published';
    }
    if (
      linkedMedia.some(
        (media) =>
          media.status === MediaStatus.REJECTED ||
          media.status === MediaStatus.FAILED,
      )
    ) {
      return 'failed';
    }
    if (linkedMedia.every((media) => media.status === MediaStatus.READY)) {
      return 'published';
    }
    return 'pending';
  }

  private firstRejectionReason(linkedMedia: Media[]): string | undefined {
    const failed = linkedMedia.find(
      (media) =>
        media.status === MediaStatus.REJECTED ||
        media.status === MediaStatus.FAILED,
    );
    return failed?.rejectionReason ?? undefined;
  }

  private async notifyPostTagsOnPublish(post: Post): Promise<void> {
    const tags = await this.tagRepo.find({
      where: { entity: FeedType.POST, entityId: post.id },
    });
    if (!tags.length) {
      return;
    }

    const author = await this.userRepo.findOne({
      where: { id: post.ownerId },
      select: ['id', 'username'],
    });
    if (!author) {
      return;
    }

    const notified = new Set<string>();
    for (const tag of tags) {
      const key = `${tag.userId}:${tag.type}`;
      if (!tag.userId || tag.userId === post.ownerId || notified.has(key)) {
        continue;
      }
      notified.add(key);
      await this.notificationDispatcher.notify({
        event: this.notificationDispatcher.eventForTagType(tag.type),
        recipientId: tag.userId,
        actorId: post.ownerId,
        context: {
          actorUsername: author.username,
          entity: FeedType.POST,
          entityId: post.id,
          tagType: tag.type as TagType,
        },
      });
    }
  }

  getExpiryDate(hours: number): Date {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  getPendingStatusExpiryDate(): Date {
    return this.getExpiryDate(PENDING_STATUS_EXPIRY_HOURS);
  }

  private emitPublished(
    event: string,
    userId: string | undefined,
    data: Record<string, unknown>,
  ): void {
    if (!userId) {
      return;
    }
    this.wsGateway.emitToUser(userId, event, { success: true, data });
  }

  private emitFailed(
    event: string,
    userId: string | undefined,
    data: Record<string, unknown>,
  ): void {
    if (!userId) {
      return;
    }
    this.wsGateway.emitToUser(userId, event, { success: true, data });
  }

  private async safeInvalidate(fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (error) {
      this.logger.warn(
        `Feed cache invalidation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
