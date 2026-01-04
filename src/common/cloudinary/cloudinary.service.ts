import { Injectable } from '@nestjs/common';
import { cloudinary } from 'src/config/cloudinary.config';

@Injectable()
export class CloudinaryService {
  generateUploadSignature(folder: string) {
    const timestamp = Math.round(Date.now() / 1000);

    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder,
      },
      process.env.CLOUDINARY_API_SECRET || '',
    );

    return {
      timestamp,
      signature,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder,
    };
  }

  videoThumbnail(publicId: string) {
    return cloudinary.url(publicId, {
      resource_type: 'video',
      format: 'jpg',
      transformation: [{ so: 0 }],
    });
  }
}
