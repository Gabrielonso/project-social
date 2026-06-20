import { Injectable } from '@nestjs/common';
import { awsConfig } from 'src/config/aws.config';
import { Media } from 'src/modules/media/entities/media.entity';
import { MediaProvider } from 'src/modules/media/enums/media-provider.enum';
import { MediaType } from 'src/modules/media/enums/media-type.enum';
import { MediaUploadFolder } from 'src/modules/media/enums/media-upload-folder.enum';

@Injectable()
export class ModerationPolicyService {
  shouldModerate(
    media: Pick<Media, 'provider' | 'type' | 'uploadFolder'>,
  ): boolean {
    if (media.provider !== MediaProvider.S3) {
      return false;
    }
    if (!awsConfig.rekognition.enabled) {
      return false;
    }
    if (![MediaType.IMAGE, MediaType.VIDEO].includes(media.type)) {
      return false;
    }
    if (!media.uploadFolder) {
      return false;
    }
    if (
      media.uploadFolder === MediaUploadFolder.USERS &&
      media.type !== MediaType.IMAGE
    ) {
      return false;
    }
    return awsConfig.rekognition.folders.includes(media.uploadFolder);
  }
}
