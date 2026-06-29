import { isCloudinaryDeliveryUrl } from '../cloudinary/cloudinary-url.util';
import { isS3DeliveryUrl } from '../s3/s3-url.util';
import { MediaProvider } from 'src/modules/media/enums/media-provider.enum';

export function detectDeliveryProvider(url: string): MediaProvider | null {
  if (!url?.trim()) {
    return null;
  }

  if (isCloudinaryDeliveryUrl(url)) {
    return MediaProvider.CLOUDINARY;
  }

  if (isS3DeliveryUrl(url)) {
    return MediaProvider.S3;
  }

  return null;
}

export function isManagedDeliveryUrl(url: string): boolean {
  return detectDeliveryProvider(url) !== null;
}
