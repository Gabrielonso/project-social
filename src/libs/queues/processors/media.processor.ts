import { OnQueueEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import * as ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import * as sharp from 'sharp';
import * as AWS from 'aws-sdk';
import { MediaService } from 'src/modules/media/media.service';
import { Job } from 'bullmq';

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
});

ffmpeg.setFfmpegPath(ffmpegPath.path);

@Processor('media')
export class MediaProcessor extends WorkerHost {
  constructor(private readonly mediaService: MediaService) {
    super();
  }

  @OnQueueEvent('active')
  async process(job: Job<any>) {
    console.log('Processing media job:', job.id);

    const { mediaId, fileKey, type } = job.data;

    if (type === 'image') {
      await this.processImage(mediaId, fileKey);
    } else if (type === 'video') {
      await this.processVideo(mediaId, fileKey);
    }

    // await this.mediaService.markProcessed(mediaId);
  }

  private async processImage(mediaId: string, fileKey: string) {
    const bucket = process.env.AWS_S3_BUCKET || '';
    const file = await s3.getObject({ Bucket: bucket, Key: fileKey }).promise();
    const buffer = file.Body as Buffer;

    // Generate thumbnail
    const thumbnailBuffer = await sharp(buffer)
      .resize(150, 150)
      .webp({ quality: 60 })
      .toBuffer();

    const upload = async (buf: Buffer, key: string) =>
      s3
        .putObject({
          Bucket: bucket,
          Key: key,
          Body: buf,
          ContentType: 'image/webp',
        })
        .promise();

    const baseKey = fileKey.replace(/\.[^/.]+$/, '');

    await upload(thumbnailBuffer, `${baseKey}-thumbnail.webp`);
    await upload(
      await sharp(buffer).resize(400).webp().toBuffer(),
      `${baseKey}-small.webp`,
    );
    await upload(
      await sharp(buffer).resize(800).webp().toBuffer(),
      `${baseKey}-medium.webp`,
    );
    await upload(
      await sharp(buffer).resize(1200).webp().toBuffer(),
      `${baseKey}-large.webp`,
    );

    // Update DB
    // await this.mediaService.updateUrls(mediaId, {
    //   thumbnailUrl: `uploads/${baseKey}-thumbnail.webp`,
    //   smallUrl: `uploads/${baseKey}-small.webp`,
    //   mediumUrl: `uploads/${baseKey}-medium.webp`,
    //   largeUrl: `uploads/${baseKey}-large.webp`,
    // });
  }

  private async processVideo(mediaId: string, fileKey: string) {
    const bucket = process.env.AWS_S3_BUCKET || '';
    const baseKey = fileKey.replace(/\.[^/.]+$/, '');
    const resolutions = [240, 360, 480, 720];

    for (const res of resolutions) {
      const outputKey = `${baseKey}-${res}p.mp4`;
      await new Promise<void>((resolve, reject) => {
        const inputStream = s3
          .getObject({ Bucket: bucket, Key: fileKey })
          .createReadStream();

        const command = ffmpeg(inputStream)
          .videoCodec('libx264')
          .size(`?x${res}`)
          .outputOptions('-preset fast', '-crf 23')
          .format('mp4')
          .on('end', resolve)
          .on('error', reject)
          .pipe();

        const uploadStream = s3
          .upload({ Bucket: bucket, Key: outputKey, Body: command })
          .promise();

        uploadStream.catch(reject);
      });
    }

    // Extract thumbnail
    const thumbnailKey = `${baseKey}-thumbnail.webp`;
    await new Promise<void>((resolve, reject) => {
      const inputStream = s3
        .getObject({ Bucket: bucket, Key: fileKey })
        .createReadStream();
      const outputBuffers: Buffer[] = [];

      ffmpeg(inputStream)
        .screenshots({
          timestamps: ['50%'],
          count: 1,
          filename: 'thumb.png',
          folder: '/tmp',
        })
        .on('end', async () => {
          const thumb = await sharp('/tmp/thumb.png')
            .resize(150, 150)
            .webp()
            .toBuffer();
          await s3
            .putObject({ Bucket: bucket, Key: thumbnailKey, Body: thumb })
            .promise();
          resolve();
        })
        .on('error', reject);
    });

    // Update DB
    // await this.mediaService.updateUrls(mediaId, {
    //   thumbnailUrl: thumbnailKey,
    //   video240Url: `${baseKey}-240p.mp4`,
    //   video360Url: `${baseKey}-360p.mp4`,
    //   video480Url: `${baseKey}-480p.mp4`,
    //   video720Url: `${baseKey}-720p.mp4`,
    // });
  }
}
