import { Injectable } from '@nestjs/common';
import { MediaStorageRegistry } from './media-storage.registry';
import { Media } from 'src/modules/media/entities/media.entity';
import { MediaStatus } from 'src/modules/media/enums/media-status.enum';
import { PlaybackUrls } from '../interfaces/media-provider.interface';

export interface MediaPlaybackPayload {
  id: string;
  type: string;
  status: string;
  width?: number;
  height?: number;
  duration?: number;
  aspectRatio?: number | null;
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
      status: media.status,
      width,
      height,
      duration: Number(media.duration) || undefined,
      aspectRatio,
      playback,
    };
  }

  isPubliclyVisible(media: Media): boolean {
    return media.status === MediaStatus.READY;
  }
}
