import { Injectable } from '@nestjs/common';
import {
  GenerateUploadInput,
  MediaProvider,
  UploadCredentials,
} from '../interfaces/media-provider.interface';
import { cloudinary } from 'src/config/cloudinary.config';

// export const CloudinaryProvider = {
//   provide: 'CLOUDINARY',
//   useFactory: () => {
//     return v2.config({
//       cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//       api_key: process.env.CLOUDINARY_API_KEY,
//       api_secret: process.env.CLOUDINARY_SECRET_KEY,
//     });
//   },
// };

@Injectable()
export class CloudinaryProvider implements MediaProvider {
  constructor() {}

  async generateUploadCredentials(
    input: GenerateUploadInput,
  ): Promise<UploadCredentials> {
    const timestamp = Math.floor(Date.now() / 1000);
    try {
      const signature = await cloudinary.utils.api_sign_request(
        {
          timestamp,
          folder: `${input.uploadFolder}/${input.userId}`,
        },
        process.env.CLOUDINARY_SECRET_KEY!,
      );

      return {
        provider: 'cloudinary',
        data: {
          cloudName: process.env.CLOUDINARY_CLOUD_NAME,
          apiKey: process.env.CLOUDINARY_API_KEY,
          timestamp,
          signature,
          folder: `${input.uploadFolder}/${input.userId}`,
        },
      };
    } catch (error) {
      throw error;
    }
  }
}
