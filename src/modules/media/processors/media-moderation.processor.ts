import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MEDIA_MODERATION_QUEUE } from '../media.queue';
import { MEDIA_JOB_MODERATE, MediaPipelineService } from '../media-pipeline.service';
import { Media } from '../entities/media.entity';
import { MediaStatus } from '../enums/media-status.enum';
import { ModerationStatus } from '../enums/moderation-status.enum';
import { MediaModerationService } from 'src/common/moderation/media-moderation.service';
import { ModerationPolicyService } from 'src/common/moderation/moderation-policy.service';
import { ContentPublishService } from '../content-publish.service';

@Processor(MEDIA_MODERATION_QUEUE)
export class MediaModerationProcessor extends WorkerHost {
  private readonly logger = new Logger(MediaModerationProcessor.name);

  constructor(
    @InjectRepository(Media)
    private readonly mediaRepo: Repository<Media>,
    private readonly moderationService: MediaModerationService,
    private readonly moderationPolicy: ModerationPolicyService,
    private readonly pipelineService: MediaPipelineService,
    private readonly contentPublishService: ContentPublishService,
  ) {
    super();
  }

  async process(job: Job<{ mediaId: string }>) {
    if (job.name !== MEDIA_JOB_MODERATE) {
      return;
    }

    const media = await this.mediaRepo.findOne({
      where: { id: job.data.mediaId },
    });

    if (!media) {
      return;
    }

    if (!this.moderationPolicy.shouldModerate(media)) {
      await this.mediaRepo.update(media.id, {
        moderationStatus: ModerationStatus.SKIPPED,
      });
      await this.pipelineService.enqueueTranscode(media.id);
      return;
    }

    try {
      const result = await this.moderationService.moderate(media);

      if (!result.passed) {
        await this.mediaRepo.update(media.id, {
          status: MediaStatus.REJECTED,
          moderationStatus: ModerationStatus.REJECTED,
          moderationLabels: result.labels as Record<string, any>,
          rejectionReason: result.rejectionReason,
          moderatedAt: new Date(),
        });
        await this.contentPublishService.onMediaTerminalUpdate(media.id);
        return;
      }

      await this.mediaRepo.update(media.id, {
        moderationStatus: ModerationStatus.PASSED,
        moderationLabels: result.labels as Record<string, any>,
        moderatedAt: new Date(),
      });
      await this.pipelineService.enqueueTranscode(media.id);
    } catch (error) {
      this.logger.error(
        `Moderation failed for ${media.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      await this.mediaRepo.update(media.id, {
        status: MediaStatus.FAILED,
        rejectionReason:
          error instanceof Error ? error.message : 'Moderation failed',
      });
      await this.contentPublishService.onMediaTerminalUpdate(media.id);
      throw error;
    }
  }
}
