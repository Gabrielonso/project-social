import { Injectable, Logger } from '@nestjs/common';
import { cloudinary } from 'src/config/cloudinary.config';
import { MediaType } from 'src/modules/media/enums/media-type.enum';
import { formatUnknownError } from '../utils/error.util';
import {
  isCloudinaryDeliveryUrl,
  resolveCloudinaryPublicId,
} from './cloudinary-url.util';

type CloudinaryResourceType = 'image' | 'video' | 'raw';

@Injectable()
export class CloudinaryCleanupService {
  private readonly logger = new Logger(CloudinaryCleanupService.name);

  async deleteAsset(input: {
    sourceIdOrKey?: string | null;
    originalUrl?: string | null;
    type?: MediaType;
  }): Promise<void> {
    const publicId = resolveCloudinaryPublicId(
      input.sourceIdOrKey,
      input.originalUrl,
    );

    if (!publicId) {
      return;
    }

    const resourceTypes = this.resourceTypesFor(input.type);
    let lastError: unknown;

    for (const resourceType of resourceTypes) {
      try {
        const result = await cloudinary.uploader.destroy(publicId, {
          resource_type: resourceType,
          invalidate: true,
        });

        if (result?.result === 'ok' || result?.result === 'not found') {
          return;
        }

        lastError = result;
        this.logger.warn(
          `Cloudinary destroy returned unexpected result for ${publicId} (${resourceType}): ${JSON.stringify(result)}`,
        );
      } catch (err) {
        lastError = err;
        this.logger.warn(
          `Cloudinary destroy failed for ${publicId} (${resourceType}): ${formatUnknownError(err)}`,
        );
      }
    }

    throw (
      lastError ??
      new Error(`Failed to delete Cloudinary asset ${publicId}`)
    );
  }

  async deleteDeliveryUrl(url?: string | null): Promise<void> {
    if (!url || !isCloudinaryDeliveryUrl(url)) {
      return;
    }

    await this.deleteAsset({ sourceIdOrKey: url, type: MediaType.IMAGE });
  }

  private resourceTypesFor(type?: MediaType): CloudinaryResourceType[] {
    if (type === MediaType.VIDEO || type === MediaType.AUDIO) {
      return ['video', 'image'];
    }

    if (type === MediaType.IMAGE) {
      return ['image', 'video'];
    }

    return ['image', 'video', 'raw'];
  }
}
