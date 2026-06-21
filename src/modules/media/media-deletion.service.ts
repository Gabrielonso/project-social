import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaDeleteSnapshot } from 'src/common/interfaces/media-provider.interface';
import { MediaStorageRegistry } from 'src/common/media/media-storage.registry';
import { Media } from './entities/media.entity';
import { MediaQueueService } from './media-queue.service';
import { MediaUsageService } from './media-usage.service';

@Injectable()
export class MediaDeletionService {
  private readonly logger = new Logger(MediaDeletionService.name);

  constructor(
    @InjectRepository(Media)
    private readonly mediaRepo: Repository<Media>,
    private readonly mediaUsageService: MediaUsageService,
    private readonly mediaQueueService: MediaQueueService,
    private readonly storageRegistry: MediaStorageRegistry,
  ) {}

  /**
   * Removes provider objects and DB rows for media IDs that are not referenced anywhere.
   */
  async deleteOrphanMedias(mediaIds: string[]): Promise<string[]> {
    const uniqueIds = [...new Set(mediaIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return [];
    }

    const orphanIds =
      await this.mediaUsageService.filterOrphanMediaIds(uniqueIds);
    const deleted: string[] = [];

    for (const id of orphanIds) {
      const media = await this.mediaRepo.findOne({ where: { id } });
      if (!media) {
        continue;
      }

      try {
        await this.purgeMedia(media);
        deleted.push(id);
      } catch (err) {
        this.logger.error(
          `Failed to purge orphan media ${id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return deleted;
  }

  /**
   * Deletes a media row and its provider objects. Skips when still referenced unless forced.
   */
  async purgeMedia(media: Media, options?: { force?: boolean }): Promise<boolean> {
    if (
      !options?.force &&
      (await this.mediaUsageService.isMediaInUse(media.id))
    ) {
      return false;
    }

    const snapshot = this.toDeleteSnapshot(media);

    await this.mediaQueueService.removePendingJobsForMedia(media.id);
    await this.mediaRepo.delete({ id: media.id });

    const provider = this.storageRegistry.get(snapshot.provider);
    if (provider.deleteMediaSnapshot) {
      await provider.deleteMediaSnapshot(snapshot);
    }

    return true;
  }

  private toDeleteSnapshot(media: Media): MediaDeleteSnapshot {
    return {
      provider: media.provider,
      sourceIdOrKey: media.sourceIdOrKey,
      variants: media.variants ?? undefined,
      type: media.type,
    };
  }
}
