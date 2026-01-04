import { v2 as cloudinaryV2 } from 'cloudinary';
import type { ConfigOptions } from 'cloudinary';

const cloudinaryConfig: ConfigOptions = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_SECRET_KEY!,
};

cloudinaryV2.config(cloudinaryConfig);

export { cloudinaryV2 as cloudinary };
