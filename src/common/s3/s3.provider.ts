import { Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';
import {
  GenerateUploadInput,
  IMediaStorageProvider,
  MediaDeleteSnapshot,
  PlaybackUrls,
  UploadCredentials,
} from '../interfaces/media-provider.interface';
import { extensionFromMimeType } from '../utils/mime.util';
import { getS3Bucket, getS3Client } from './s3.client';
import { Media } from 'src/modules/media/entities/media.entity';
import { MediaProvider } from 'src/modules/media/enums/media-provider.enum';
import { MediaStatus } from 'src/modules/media/enums/media-status.enum';
import { MediaType } from 'src/modules/media/enums/media-type.enum';
import { awsConfig } from 'src/config/aws.config';

const PRESIGNED_EXPIRY_SECONDS = 1800;

@Injectable()
export class S3Provider implements IMediaStorageProvider {
  readonly provider = MediaProvider.S3;

  buildObjectKey(input: GenerateUploadInput): string {
    const ext = extensionFromMimeType(input.mimeType);
    return `${input.uploadFolder}/${input.userId}/${nanoid()}.${ext}`;
  }

  getPublicUrl(key: string): string {
    if (awsConfig.s3.cdnBaseUrl) {
      return `${awsConfig.s3.cdnBaseUrl.replace(/\/$/, '')}/${key}`;
    }
    const bucket = getS3Bucket();
    return `https://${bucket}.s3.${awsConfig.region}.amazonaws.com/${key}`;
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await getS3Client()
        .headObject({ Bucket: getS3Bucket(), Key: key })
        .promise();
      return true;
    } catch {
      return false;
    }
  }

  async generateUploadCredentials(
    input: GenerateUploadInput,
  ): Promise<UploadCredentials> {
    try {
      console.log(input, '<<==input');
      const key = this.buildObjectKey(input);
      console.log(key, '<<==key');
      const uploadUrl = await getS3Client().getSignedUrlPromise('putObject', {
        Bucket: getS3Bucket(),
        Key: key,
        ContentType: input.mimeType,
        Expires: PRESIGNED_EXPIRY_SECONDS,
      });
      console.log(uploadUrl, '<uurl');
      return {
        provider: 's3',
        data: {
          uploadUrl,
          key,
          expiresIn: PRESIGNED_EXPIRY_SECONDS,
          publicUrl: this.getPublicUrl(key),
        },
      };
    } catch (error) {
      console.error('[Get upload credentials]:', error);
      throw error;
    }
  }

  resolveInitialStatus(_type: MediaType): MediaStatus {
    return MediaStatus.PROCESSING;
  }

  requiresTranscoding(type: MediaType): boolean {
    return (
      type === MediaType.IMAGE ||
      type === MediaType.VIDEO ||
      type === MediaType.AUDIO
    );
  }

  /** Resolve an S3 object key to a delivery URL (CDN or direct S3). */
  private urlForKey(key?: string | null): string | null {
    return key ? this.getPublicUrl(key) : null;
  }

  /**
   * Always resolve playback URLs from stored keys at serve time so CDN
   * changes (MEDIA_CDN_BASE_URL) apply without re-transcoding or DB migration.
   */
  getPlaybackUrls(media: Media): PlaybackUrls {
    const variants = (media.variants ?? {}) as Record<string, string>;
    const original = this.getPublicUrl(media.sourceIdOrKey);

    let stream: string | null = null;
    if (media.type === MediaType.VIDEO) {
      stream = this.urlForKey(variants.hls) ?? original;
    } else if (media.type === MediaType.AUDIO) {
      stream = original;
    }

    let poster: string | null = null;
    if (media.type === MediaType.IMAGE) {
      poster = this.urlForKey(variants.poster) ?? original;
    } else if (media.type === MediaType.VIDEO) {
      poster = this.urlForKey(variants.poster);
    }

    return {
      original,
      stream,
      poster,
      low: this.urlForKey(variants.low),
    };
  }

  collectKeysFromSnapshot(snapshot: MediaDeleteSnapshot): string[] {
    const keys = new Set<string>();
    keys.add(snapshot.sourceIdOrKey);

    const variants = snapshot.variants ?? {};
    for (const value of Object.values(variants)) {
      if (value) {
        keys.add(value);
      }
    }

    if (snapshot.type === MediaType.VIDEO) {
      const baseKey = snapshot.sourceIdOrKey.replace(/\.[^/.]+$/, '');
      keys.add(`${baseKey}/hls/stream.mp4`);
      keys.add(`${baseKey}/hls/index.m3u8`);
      keys.add(`${baseKey}-poster.webp`);
    }

    if (snapshot.type === MediaType.IMAGE) {
      const baseKey = snapshot.sourceIdOrKey.replace(/\.[^/.]+$/, '');
      keys.add(`${baseKey}-thumb.webp`);
      keys.add(`${baseKey}-low.webp`);
    }

    return [...keys];
  }

  async listKeysUnderPrefix(prefix: string): Promise<string[]> {
    const bucket = getS3Bucket();
    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await getS3Client()
        .listObjectsV2({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
        .promise();

      for (const item of response.Contents ?? []) {
        if (item.Key) {
          keys.push(item.Key);
        }
      }

      continuationToken = response.IsTruncated
        ? response.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return keys;
  }

  async deleteKeys(keys: string[]): Promise<void> {
    const uniqueKeys = [...new Set(keys.filter(Boolean))];
    if (uniqueKeys.length === 0) {
      return;
    }

    const bucket = getS3Bucket();
    const chunkSize = 1000;

    for (let i = 0; i < uniqueKeys.length; i += chunkSize) {
      const chunk = uniqueKeys.slice(i, i + chunkSize);
      await getS3Client()
        .deleteObjects({
          Bucket: bucket,
          Delete: {
            Objects: chunk.map((Key) => ({ Key })),
            Quiet: true,
          },
        })
        .promise();
    }
  }

  async deleteMediaSnapshot(snapshot: MediaDeleteSnapshot): Promise<void> {
    const keys = this.collectKeysFromSnapshot(snapshot);

    if (snapshot.type === MediaType.VIDEO) {
      const baseKey = snapshot.sourceIdOrKey.replace(/\.[^/.]+$/, '');
      const hlsKeys = await this.listKeysUnderPrefix(`${baseKey}/hls/`);
      keys.push(...hlsKeys);
    }

    await this.deleteKeys(keys);
  }
}
