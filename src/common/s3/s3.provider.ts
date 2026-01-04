import { Injectable } from '@nestjs/common';
import {
  GenerateUploadInput,
  MediaProvider,
  UploadCredentials,
} from '../interfaces/media-provider.interface';
import { S3 } from 'aws-sdk';

@Injectable()
export class S3Provider implements MediaProvider {
  constructor() {}

  async generateUploadCredentials(
    input: GenerateUploadInput,
  ): Promise<UploadCredentials> {
    const region = process.env.AWS_BUCKET_REGION;
    const accessKey = process.env.AWS_ACCESS_KEY;
    const secretKey = process.env.AWS_SECRET_KEY;
    try {
      const s3 = new S3({
        region: region,
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      });
      // const key = `posts/${input.userId}/${uuid()}`;
      const key: string = '';

      const params = {
        Bucket: process.env.S3_BUCKET,
        Key: key,
        ContentType: input.mimeType,
        Expires: 1800,
      };
      const uploadUrl: string = await s3.getSignedUrlPromise(
        'putObject',
        params,
      );

      return {
        provider: 's3',
        data: {
          uploadUrl,
          key,
        },
      };
    } catch (error) {
      throw error;
    }
  }
}
