import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaDeleteSnapshot } from 'src/common/interfaces/media-provider.interface';
import { MediaStorageRegistry } from 'src/common/media/media-storage.registry';
import { extractCloudinaryPublicId } from 'src/common/cloudinary/cloudinary-url.util';
import { extractS3ObjectKey } from 'src/common/s3/s3-url.util';
import { isManagedDeliveryUrl } from 'src/common/media/delivery-url.util';
import { Media } from './entities/media.entity';
import { MediaQueueService } from './media-queue.service';
import { MediaUsageService } from './media-usage.service';
import { formatUnknownError } from 'src/common/utils/error.util';

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
          `Failed to purge orphan media ${id}: ${formatUnknownError(err)}`,
        );
      }
    }

    return deleted;
  }

  /**
   * Cleans up a delivery URL when it is no longer referenced.
   * Handles both managed Media rows and URL-only assets (e.g. profile pictures).
   */
  async deleteOrphanDeliveryUrl(url?: string | null): Promise<void> {
    if (!url?.trim() || !isManagedDeliveryUrl(url)) {
      return;
    }

    const matchingIds = await this.findMediaIdsByDeliveryUrl(url);
    if (matchingIds.length > 0) {
      const deleted = await this.deleteOrphanMedias(matchingIds);
      if (deleted.length > 0) {
        return;
      }

      return;
    }

    await this.storageRegistry.deleteDeliveryUrl(url);
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

    const provider = this.storageRegistry.get(snapshot.provider);
    if (provider.deleteMediaSnapshot) {
      await provider.deleteMediaSnapshot(snapshot);
    }

    await this.mediaRepo.delete({ id: media.id });

    return true;
  }

  private toDeleteSnapshot(media: Media): MediaDeleteSnapshot {
    return {
      provider: media.provider,
      sourceIdOrKey: media.sourceIdOrKey,
      originalUrl: media.originalUrl,
      variants: media.variants ?? undefined,
      type: media.type,
    };
  }

  private async findMediaIdsByDeliveryUrl(url: string): Promise<string[]> {
    const candidates = new Set<string>([url]);

    const cloudinaryPublicId = extractCloudinaryPublicId(url);
    if (cloudinaryPublicId) {
      candidates.add(cloudinaryPublicId);
    }

    const s3Key = extractS3ObjectKey(url);
    if (s3Key) {
      candidates.add(s3Key);
    }

    const values = [...candidates].filter(Boolean);
    if (values.length === 0) {
      return [];
    }

    const rows = await this.mediaRepo
      .createQueryBuilder('media')
      .select('media.id', 'id')
      .where('media.original_url IN (:...values)', { values })
      .orWhere('media.source_id_or_key IN (:...values)', { values })
      .getRawMany<{ id: string }>();

    return rows.map((row) => row.id);
  }
}
