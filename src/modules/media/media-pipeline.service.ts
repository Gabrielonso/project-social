import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MEDIA_MODERATION_QUEUE,
  MEDIA_TRANSCODE_QUEUE,
} from './media.queue';
import { Media } from './entities/media.entity';
import { MediaStatus } from './enums/media-status.enum';
import { ModerationStatus } from './enums/moderation-status.enum';
import { ModerationPolicyService } from 'src/common/moderation/moderation-policy.service';
import { S3Provider } from 'src/common/s3/s3.provider';
import { MediaProvider } from './enums/media-provider.enum';

export const MEDIA_JOB_MODERATE = 'moderate';
export const MEDIA_JOB_TRANSCODE = 'transcode';

@Injectable()
export class MediaPipelineService {
  private readonly logger = new Logger(MediaPipelineService.name);

  constructor(
    @InjectRepository(Media)
    private readonly mediaRepo: Repository<Media>,
    @InjectQueue(MEDIA_MODERATION_QUEUE)
    private readonly moderationQueue: Queue,
    @InjectQueue(MEDIA_TRANSCODE_QUEUE)
    private readonly transcodeQueue: Queue,
    private readonly moderationPolicy: ModerationPolicyService,
    private readonly s3Provider: S3Provider,
  ) {}

  async routeAfterUpload(mediaId: string): Promise<Media> {
    const media = await this.mediaRepo.findOneByOrFail({ id: mediaId });

    if (media.provider !== MediaProvider.S3) {
      throw new Error('Pipeline routing is only supported for S3 media');
    }

    const exists = await this.s3Provider.objectExists(media.sourceIdOrKey);
    if (!exists) {
      throw new Error('Uploaded object not found in S3');
    }

    await this.mediaRepo.update(mediaId, { status: MediaStatus.UPLOADED });

    if (this.moderationPolicy.shouldModerate(media)) {
      await this.mediaRepo.update(mediaId, {
        moderationStatus: ModerationStatus.PENDING,
        status: MediaStatus.MODERATING,
      });
      await this.moderationQueue.add(MEDIA_JOB_MODERATE, { mediaId });
      this.logger.log(`Enqueued moderation for media ${mediaId}`);
    } else {
      await this.mediaRepo.update(mediaId, {
        moderationStatus: ModerationStatus.SKIPPED,
      });
      await this.enqueueTranscode(mediaId);
      this.logger.log(`Skipped moderation, enqueued transcode for ${mediaId}`);
    }

    return this.mediaRepo.findOneByOrFail({ id: mediaId });
  }

  async enqueueTranscode(mediaId: string): Promise<void> {
    await this.mediaRepo.update(mediaId, { status: MediaStatus.PROCESSING });
    await this.transcodeQueue.add(MEDIA_JOB_TRANSCODE, { mediaId });
  }
}
