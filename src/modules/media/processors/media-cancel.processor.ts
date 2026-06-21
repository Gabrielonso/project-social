import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger, forwardRef } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MEDIA_CANCEL_QUEUE,
  MEDIA_JOB_CANCEL,
} from '../media.queue';
import { MediaCancelPayload } from '../media-queue.service';
import { Media } from '../entities/media.entity';
import { MediaUsageService } from '../media-usage.service';
import { MediaQueueService } from '../media-queue.service';
import { MediaStorageRegistry } from 'src/common/media/media-storage.registry';
import { MediaDeleteSnapshot } from 'src/common/interfaces/media-provider.interface';
import { WsGateway } from 'src/realtime/gateway/ws.gateway';

@Processor(MEDIA_CANCEL_QUEUE)
export class MediaCancelProcessor extends WorkerHost {
  private readonly logger = new Logger(MediaCancelProcessor.name);

  constructor(
    @InjectRepository(Media)
    private readonly mediaRepo: Repository<Media>,
    private readonly mediaUsageService: MediaUsageService,
    private readonly mediaQueueService: MediaQueueService,
    private readonly storageRegistry: MediaStorageRegistry,
    @Inject(forwardRef(() => WsGateway))
    private readonly wsGateway: WsGateway,
  ) {
    super();
  }

  async process(job: Job<MediaCancelPayload>) {
    if (job.name !== MEDIA_JOB_CANCEL) {
      return;
    }

    const { mediaId, userId } = job.data;

    try {
      const media = await this.mediaRepo.findOne({ where: { id: mediaId } });

      if (!media) {
        this.emitCancelled(userId, mediaId);
        return;
      }

      if (media.ownerId !== userId) {
        this.emitFailed(userId, mediaId, 'FORBIDDEN', 'You do not own this media');
        return;
      }

      if (await this.mediaUsageService.isMediaInUse(mediaId)) {
        this.emitFailed(
          userId,
          mediaId,
          'ATTACHED',
          'Media is already attached to content',
        );
        return;
      }

      const snapshot: MediaDeleteSnapshot = {
        provider: media.provider,
        sourceIdOrKey: media.sourceIdOrKey,
        variants: media.variants ?? undefined,
        type: media.type,
      };

      await this.mediaQueueService.removePendingJobsForMedia(mediaId);
      await this.mediaRepo.delete({ id: mediaId });

      const provider = this.storageRegistry.get(snapshot.provider);
      if (provider.deleteMediaSnapshot) {
        await provider.deleteMediaSnapshot(snapshot);
      }

      this.emitCancelled(userId, mediaId);
    } catch (error) {
      this.logger.error(
        `Cancel failed for ${mediaId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.emitFailed(
        userId,
        mediaId,
        'UNKNOWN',
        error instanceof Error ? error.message : 'Cancel failed',
      );
      throw error;
    }
  }

  private emitCancelled(userId: string, mediaId: string) {
    this.wsGateway.emitToUser(userId, 'media.cancelled', {
      success: true,
      data: { mediaId },
    });
  }

  private emitFailed(
    userId: string,
    mediaId: string,
    code: string,
    message: string,
  ) {
    this.wsGateway.emitToUser(userId, 'media.cancel_failed', {
      success: false,
      error: { code, message, mediaId },
    });
  }
}
