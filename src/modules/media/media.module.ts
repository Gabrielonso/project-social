import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { MEDIA_PROVIDER } from 'src/common/constants';
import { MediaService } from './media.service';
import { S3Provider } from 'src/common/s3/s3.provider';
import { CloudinaryProvider } from 'src/common/cloudinary/cloudinary.provider';
import { MediaController } from './media.controller';
import { Media } from './entities/media.entity';
import { MediaStorageRegistry } from 'src/common/media/media-storage.registry';
import { MediaUrlResolver } from 'src/common/media/media-url.resolver';
import { ModerationModule } from 'src/common/moderation/moderation.module';
import { MediaPipelineService } from './media-pipeline.service';
import { MediaAttachValidator } from './media-attach.validator';
import {
  MEDIA_MODERATION_QUEUE,
  MEDIA_TRANSCODE_QUEUE,
} from './media.queue';
import { MediaModerationProcessor } from './processors/media-moderation.processor';
import { MediaTranscodeProcessor } from './processors/media-transcode.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Media]),
    BullModule.registerQueue(
      { name: MEDIA_MODERATION_QUEUE },
      { name: MEDIA_TRANSCODE_QUEUE },
    ),
    ModerationModule,
  ],
  providers: [
    S3Provider,
    CloudinaryProvider,
    MediaStorageRegistry,
    MediaUrlResolver,
    {
      provide: MEDIA_PROVIDER,
      useFactory: (registry: MediaStorageRegistry) => registry.getDefault(),
      inject: [MediaStorageRegistry],
    },
    MediaService,
    MediaPipelineService,
    MediaAttachValidator,
    MediaModerationProcessor,
    MediaTranscodeProcessor,
  ],
  controllers: [MediaController],
  exports: [
    MEDIA_PROVIDER,
    MediaStorageRegistry,
    MediaUrlResolver,
    MediaAttachValidator,
    MediaService,
  ],
})
export class MediaModule {}
