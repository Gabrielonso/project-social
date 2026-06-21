import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Media } from './entities/media.entity';
import { MediaStatus } from './enums/media-status.enum';
import { MediaUploadFolder } from './enums/media-upload-folder.enum';
import { ContentPublishStatus } from './enums/content-publish-status.enum';
import { MediaStorageRegistry } from 'src/common/media/media-storage.registry';
import { isModerationCleared } from './media-delivery.util';

const PENDING_ATTACH_STATUSES = new Set<MediaStatus>([
  MediaStatus.UPLOADED,
  MediaStatus.MODERATING,
  MediaStatus.PROCESSING,
  MediaStatus.READY,
]);

@Injectable()
export class MediaAttachValidator {
  constructor(
    @InjectRepository(Media)
    private readonly mediaRepo: Repository<Media>,
    private readonly storageRegistry: MediaStorageRegistry,
  ) {}

  async validateMediaIdsForAttach(
    mediaIds: string[],
    userId: string,
    expectedFolder: MediaUploadFolder,
  ): Promise<Media[]> {
    return this.validateMediaIds(mediaIds, userId, expectedFolder, 'strict');
  }

  async validateMediaIdsForAttachPending(
    mediaIds: string[],
    userId: string,
    expectedFolder: MediaUploadFolder,
  ): Promise<Media[]> {
    return this.validateMediaIds(mediaIds, userId, expectedFolder, 'pending');
  }

  resolveInitialPublishStatus(
    mediaList: Media[],
    sound?: Media | null,
  ): ContentPublishStatus {
    const allMedia = sound ? [...mediaList, sound] : mediaList;
    if (allMedia.length === 0) {
      return ContentPublishStatus.PUBLISHED;
    }
    const allCleared = allMedia.every((media) => isModerationCleared(media));
    return allCleared
      ? ContentPublishStatus.PUBLISHED
      : ContentPublishStatus.PENDING;
  }

  resolveLegacyStatus(
    provider: Media['provider'],
    type: Media['type'],
  ): MediaStatus {
    return this.storageRegistry.get(provider).resolveInitialStatus(type);
  }

  private async validateMediaIds(
    mediaIds: string[],
    userId: string,
    expectedFolder: MediaUploadFolder,
    mode: 'strict' | 'pending',
  ): Promise<Media[]> {
    if (!mediaIds.length) {
      return [];
    }

    const mediaList = await this.mediaRepo.find({
      where: { id: In(mediaIds), ownerId: userId },
    });

    if (mediaList.length !== mediaIds.length) {
      throw new NotFoundException('One or more media records were not found');
    }

    for (const media of mediaList) {
      if (media.uploadFolder && media.uploadFolder !== expectedFolder) {
        throw new ForbiddenException(
          `Media ${media.id} belongs to folder ${media.uploadFolder}, expected ${expectedFolder}`,
        );
      }

      if (!media.sourceIdOrKey.startsWith(`${expectedFolder}/${userId}/`)) {
        throw new ForbiddenException('Invalid media ownership or folder');
      }

      if (media.status === MediaStatus.REJECTED) {
        throw new ForbiddenException(
          `Media ${media.id} was rejected by moderation`,
        );
      }

      if (mode === 'strict') {
        if (media.status !== MediaStatus.READY) {
          throw new ForbiddenException(
            `Media ${media.id} is not ready (status: ${media.status})`,
          );
        }
      } else if (!PENDING_ATTACH_STATUSES.has(media.status)) {
        throw new ForbiddenException(
          `Media ${media.id} cannot be attached yet (status: ${media.status})`,
        );
      }
    }

    return mediaIds.map((id) => mediaList.find((media) => media.id === id)!);
  }
}
