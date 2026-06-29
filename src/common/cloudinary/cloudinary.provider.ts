import { Injectable } from '@nestjs/common';
import { cloudinary } from 'src/config/cloudinary.config';
import { CloudinaryCleanupService } from './cloudinary-cleanup.service';
import {
  GenerateUploadInput,
  IMediaStorageProvider,
  MediaDeleteSnapshot,
  PlaybackUrls,
  UploadCredentials,
} from '../interfaces/media-provider.interface';
import { Media } from 'src/modules/media/entities/media.entity';
import { MediaProvider } from 'src/modules/media/enums/media-provider.enum';
import { MediaStatus } from 'src/modules/media/enums/media-status.enum';
import { MediaType } from 'src/modules/media/enums/media-type.enum';

@Injectable()
export class CloudinaryProvider implements IMediaStorageProvider {
  readonly provider = MediaProvider.CLOUDINARY;

  constructor(
    private readonly cloudinaryCleanup: CloudinaryCleanupService,
  ) {}

  async generateUploadCredentials(
    input: GenerateUploadInput,
  ): Promise<UploadCredentials> {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `${input.uploadFolder}/${input.userId}`;
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      process.env.CLOUDINARY_SECRET_KEY!,
    );

    return {
      provider: 'cloudinary',
      data: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        timestamp,
        signature,
        folder,
      },
    };
  }

  resolveInitialStatus(_type: MediaType): MediaStatus {
    return MediaStatus.READY;
  }

  requiresTranscoding(_type: MediaType): boolean {
    return false;
  }

  getPlaybackUrls(media: Media): PlaybackUrls {
    const publicId = media.sourceIdOrKey;
    const isVideo = media.type === MediaType.VIDEO;
    const resourceType = isVideo ? 'video' : 'image';

    return {
      original:
        media.originalUrl ??
        cloudinary.url(publicId, { resource_type: resourceType, secure: true }),
      stream:
        media.streamUrl ??
        (isVideo
          ? cloudinary.url(publicId, {
              resource_type: 'video',
              format: 'm3u8',
              streaming_profile: 'hd',
              secure: true,
            })
          : null),
      poster:
        media.thumbnailUrl ??
        (isVideo
          ? cloudinary.url(publicId, {
              resource_type: 'video',
              format: 'jpg',
              transformation: [{ start_offset: '0' }],
              secure: true,
            })
          : cloudinary.url(publicId, { resource_type: 'image', secure: true })),
      low: media.lowUrl ?? null,
    };
  }

  async deleteMediaSnapshot(snapshot: MediaDeleteSnapshot): Promise<void> {
    await this.cloudinaryCleanup.deleteAsset({
      sourceIdOrKey: snapshot.sourceIdOrKey,
      originalUrl: snapshot.originalUrl,
      type: snapshot.type,
    });
  }

  async deleteByDeliveryUrl(url: string): Promise<void> {
    await this.cloudinaryCleanup.deleteDeliveryUrl(url);
  }
}
