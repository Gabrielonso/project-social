import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  MEDIA_CANCEL_QUEUE,
  MEDIA_JOB_CANCEL,
  MEDIA_MODERATION_QUEUE,
  MEDIA_TRANSCODE_QUEUE,
} from './media.queue';

export interface MediaCancelPayload {
  mediaId: string;
  userId: string;
}

@Injectable()
export class MediaQueueService {
  constructor(
    @InjectQueue(MEDIA_MODERATION_QUEUE)
    private readonly moderationQueue: Queue,
    @InjectQueue(MEDIA_TRANSCODE_QUEUE)
    private readonly transcodeQueue: Queue,
    @InjectQueue(MEDIA_CANCEL_QUEUE)
    private readonly cancelQueue: Queue,
  ) {}

  async enqueueCancel(mediaId: string, userId: string): Promise<void> {
    const jobId = `cancel:${mediaId}`;
    const existing = await this.cancelQueue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (['waiting', 'delayed', 'active'].includes(state)) {
        return;
      }
      await existing.remove();
    }

    await this.cancelQueue.add(
      MEDIA_JOB_CANCEL,
      { mediaId, userId } satisfies MediaCancelPayload,
      {
        jobId,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }

  async removePendingJobsForMedia(mediaId: string): Promise<void> {
    for (const queue of [this.moderationQueue, this.transcodeQueue]) {
      const jobs = await queue.getJobs(['waiting', 'delayed', 'paused']);
      await Promise.all(
        jobs
          .filter((job) => job.data?.mediaId === mediaId)
          .map((job) => job.remove()),
      );
    }
  }
}
