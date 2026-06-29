import { Media } from 'src/modules/media/entities/media.entity';
import { MediaProvider as MediaProviderType } from 'src/modules/media/enums/media-provider.enum';
import { MediaStatus } from 'src/modules/media/enums/media-status.enum';
import { MediaType } from 'src/modules/media/enums/media-type.enum';
import { MediaUploadFolder } from 'src/modules/media/enums/media-upload-folder.enum';

export interface MediaDeleteSnapshot {
  provider: MediaProviderType;
  sourceIdOrKey: string;
  originalUrl?: string | null;
  variants?: Record<string, string>;
  type: MediaType;
}

export interface GenerateUploadInput {
  userId: string;
  type: MediaType;
  mimeType: string;
  size: number;
  uploadFolder: MediaUploadFolder;
}

export interface UploadCredentials {
  provider: 's3' | 'cloudinary';
  data: Record<string, unknown>;
}

export interface PlaybackUrls {
  original?: string | null;
  stream?: string | null;
  poster?: string | null;
  low?: string | null;
}

/** @deprecated use IMediaStorageProvider */
export type MediaProvider = IMediaStorageProvider;

export interface IMediaStorageProvider {
  readonly provider: MediaProviderType;

  generateUploadCredentials(
    input: GenerateUploadInput,
  ): Promise<UploadCredentials>;

  resolveInitialStatus(type: MediaType): MediaStatus;

  requiresTranscoding(type: MediaType): boolean;

  getPlaybackUrls(media: Media): PlaybackUrls;

  objectExists?(key: string): Promise<boolean>;

  deleteMediaSnapshot?(snapshot: MediaDeleteSnapshot): Promise<void>;

  deleteByDeliveryUrl?(url: string): Promise<void>;
}

export interface CreateUploadSessionResult {
  mediaId: string;
  uploadUrl: string;
  key: string;
  expiresIn: number;
  provider: MediaProviderType;
}
