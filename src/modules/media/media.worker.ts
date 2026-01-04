import { Processor } from '@nestjs/bullmq';
import { MEDIA_QUEUE } from './media.queue';
import { Repository } from 'typeorm';
import { Media } from './entities/media.entity';
import { VideoProcessor } from './processors/video.processor';
import { MediaStatus } from './enums/media-status.enum';
import { Job } from 'bullmq';

@Processor(MEDIA_QUEUE)
export class MediaWorker {
  constructor(
    private mediaRepo: Repository<Media>,
    private videoProcessor: VideoProcessor,
  ) {}

  // @Process('process-video')
  async handle(job: Job<{ mediaId: string }>) {
    const media = await this.mediaRepo.findOneByOrFail({
      id: job.data.mediaId,
    });

    try {
      await this.mediaRepo.update(media.id, {
        status: MediaStatus.PROCESSING,
      });

      // const result = await this.videoProcessor.process(media);

      await this.mediaRepo.update(media.id, {
        status: MediaStatus.READY,
        // variants: result,
      });
    } catch {
      await this.mediaRepo.update(media.id, {
        status: MediaStatus.FAILED,
      });
      throw new Error('Video processing failed');
    }
  }
}
