import * as dotenv from 'dotenv';
import { MediaUploadFolder } from 'src/modules/media/enums/media-upload-folder.enum';

dotenv.config();

function parseList(value: string | undefined, fallback: string): string[] {
  return (value ?? fallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const awsConfig = {
  region:
    process.env.AWS_REGION ?? process.env.AWS_BUCKET_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId:
      process.env.AWS_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY ?? '',
    secretAccessKey:
      process.env.AWS_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_KEY ?? '',
  },
  s3: {
    bucket: process.env.AWS_S3_BUCKET ?? process.env.S3_BUCKET ?? '',
    cdnBaseUrl:
      process.env.MEDIA_CDN_BASE_URL ?? process.env.AWS_CDN_BASE_URL ?? '',
  },
  rekognition: {
    enabled: process.env.REKOGNITION_ENABLED !== 'false',
    minConfidence: Number(process.env.REKOGNITION_MIN_CONFIDENCE ?? 80),
    folders: parseList(
      process.env.REKOGNITION_FOLDERS,
      'posts,ads,status,users',
    ) as MediaUploadFolder[],
    rejectLabels: parseList(
      process.env.REKOGNITION_REJECT_LABELS,
      'Exposed Female Nipple,Exposed Male Genitalia,Exposed Female Genitalia,Explicit Sexual Activity,Sex Toys',
    ),
  },
};

export function getDefaultMediaProvider(): 's3' | 'cloudinary' {
  return process.env.MEDIA_PROVIDER === 'cloudinary' ? 'cloudinary' : 's3';
}
