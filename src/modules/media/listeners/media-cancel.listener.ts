import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MediaQueueService } from '../media-queue.service';

export interface MediaCancelUploadEvent {
  mediaId: string;
  userId: string;
}

@Injectable()
export class MediaCancelListener {
  constructor(private readonly mediaQueueService: MediaQueueService) {}

  @OnEvent('media.cancel_upload')
  async handleCancelUpload(payload: MediaCancelUploadEvent) {
    await this.mediaQueueService.enqueueCancel(payload.mediaId, payload.userId);
  }
}
