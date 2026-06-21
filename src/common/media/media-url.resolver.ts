import { Injectable } from '@nestjs/common';
import { MediaStorageRegistry } from './media-storage.registry';
import { Media } from 'src/modules/media/entities/media.entity';
import { PlaybackUrls } from '../interfaces/media-provider.interface';
import {
  effectiveMediaStatus,
  hasDeliverableUpload,
  isPubliclyDeliverable,
} from 'src/modules/media/media-delivery.util';

export interface MediaPlaybackPayload {
  id: string;
  type: string;
  status: string;
  width?: number;
  height?: number;
  duration?: number;
  aspectRatio?: number | null;
  fileName?: string;
  playback: PlaybackUrls;
}

@Injectable()
export class MediaUrlResolver {
  constructor(private readonly registry: MediaStorageRegistry) {}

  resolve(media: Media): PlaybackUrls {
    return this.registry.get(media.provider).getPlaybackUrls(media);
  }

  toPlaybackPayload(media: Media): MediaPlaybackPayload {
    const playback = this.resolve(media);
    const width = Number(media.width) || undefined;
    const height = Number(media.height) || undefined;
    const aspectRatio =
      width && height && height > 0 ? width / height : null;

    return {
      id: media.id,
      type: media.type,
      status: effectiveMediaStatus(media),
      width,
      height,
      duration: Number(media.duration) || undefined,
      aspectRatio,
      fileName: media.fileName ?? undefined,
      playback,
    };
  }

  isPubliclyVisible(media: Media): boolean {
    return isPubliclyDeliverable(media);
  }

  hasPlayback(media: Media): boolean {
    return hasDeliverableUpload(media);
  }
}
