import { MEDIA_PROVIDER } from 'src/common/constants';
import { MediaService } from './media.service';
import { S3Provider } from 'src/common/s3/s3.provider';
import { CloudinaryProvider } from 'src/common/cloudinary/cloudinary.provider';
import { MediaController } from './media.controller';
import { Module } from '@nestjs/common';

@Module({
  providers: [
    {
      provide: MEDIA_PROVIDER,
      useClass:
        process.env.MEDIA_PROVIDER === 'cloudinary'
          ? S3Provider
          : CloudinaryProvider,
    },
    MediaService,
  ],
  controllers: [MediaController],
  exports: [MEDIA_PROVIDER],
})
export class MediaModule {}
