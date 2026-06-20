import { S3 } from 'aws-sdk';
import { awsConfig } from 'src/config/aws.config';

let s3Client: S3 | null = null;

export function getS3Client(): S3 {
  if (!s3Client) {
    console.log(awsConfig);
    s3Client = new S3({
      region: awsConfig.region,
      accessKeyId: awsConfig.credentials.accessKeyId,
      secretAccessKey: awsConfig.credentials.secretAccessKey,
      signatureVersion: 'v4',
    });
  }
  return s3Client;
}

export function getS3Bucket(): string {
  return awsConfig.s3.bucket;
}
