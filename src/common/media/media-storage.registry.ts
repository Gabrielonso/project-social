import { Injectable } from '@nestjs/common';
import { IMediaStorageProvider } from '../interfaces/media-provider.interface';
import { S3Provider } from '../s3/s3.provider';
import { CloudinaryProvider } from '../cloudinary/cloudinary.provider';
import { MediaProvider } from 'src/modules/media/enums/media-provider.enum';
import { getDefaultMediaProvider } from 'src/config/aws.config';

@Injectable()
export class MediaStorageRegistry {
  private readonly providers: Map<MediaProvider, IMediaStorageProvider>;

  constructor(
    private readonly s3Provider: S3Provider,
    private readonly cloudinaryProvider: CloudinaryProvider,
  ) {
    this.providers = new Map<MediaProvider, IMediaStorageProvider>([
      [MediaProvider.S3, s3Provider],
      [MediaProvider.CLOUDINARY, cloudinaryProvider],
    ]);
  }

  get(provider: MediaProvider): IMediaStorageProvider {
    const resolved = this.providers.get(provider);
    if (!resolved) {
      throw new Error(`Unknown media provider: ${provider}`);
    }
    return resolved;
  }

  getDefault(): IMediaStorageProvider {
    const name = getDefaultMediaProvider();
    return this.get(
      name === 'cloudinary' ? MediaProvider.CLOUDINARY : MediaProvider.S3,
    );
  }
}
