import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import * as sharp from 'sharp';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PassThrough } from 'stream';
import { MEDIA_TRANSCODE_QUEUE } from '../media.queue';
import { MEDIA_JOB_TRANSCODE } from '../media-pipeline.service';
import { Media } from '../entities/media.entity';
import { MediaStatus } from '../enums/media-status.enum';
import { MediaType } from '../enums/media-type.enum';
import { MediaProvider } from '../enums/media-provider.enum';
import { getS3Bucket, getS3Client } from 'src/common/s3/s3.client';
import { S3Provider } from 'src/common/s3/s3.provider';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

@Processor(MEDIA_TRANSCODE_QUEUE)
export class MediaTranscodeProcessor extends WorkerHost {
  private readonly logger = new Logger(MediaTranscodeProcessor.name);

  constructor(
    @InjectRepository(Media)
    private readonly mediaRepo: Repository<Media>,
    private readonly s3Provider: S3Provider,
  ) {
    super();
  }

  async process(job: Job<{ mediaId: string }>) {
    if (job.name !== MEDIA_JOB_TRANSCODE) {
      return;
    }

    const media = await this.mediaRepo.findOneByOrFail({
      id: job.data.mediaId,
    });

    if (media.provider !== MediaProvider.S3) {
      return;
    }

    try {
      if (media.type === MediaType.IMAGE) {
        await this.processImage(media);
      } else if (media.type === MediaType.VIDEO) {
        await this.processVideo(media);
      } else {
        await this.processPassthrough(media);
      }

      await this.mediaRepo.update(media.id, { status: MediaStatus.READY });
    } catch (error) {
      this.logger.error(
        `Transcode failed for ${media.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      await this.mediaRepo.update(media.id, { status: MediaStatus.FAILED });
      throw error;
    }
  }

  private async processPassthrough(media: Media) {
    const originalUrl = this.s3Provider.getPublicUrl(media.sourceIdOrKey);
    await this.mediaRepo.update(media.id, {
      originalUrl,
      streamUrl:
        media.type === MediaType.AUDIO ? originalUrl : media.streamUrl,
    });
  }

  private async processImage(media: Media) {
    const bucket = getS3Bucket();
    const key = media.sourceIdOrKey;
    const file = await getS3Client()
      .getObject({ Bucket: bucket, Key: key })
      .promise();
    const buffer = file.Body as Buffer;
    const baseKey = key.replace(/\.[^/.]+$/, '');

    const thumbnailBuffer = await sharp(buffer)
      .resize(400, 400, { fit: 'inside' })
      .webp({ quality: 70 })
      .toBuffer();

    const lowBuffer = await sharp(buffer)
      .resize(800, 800, { fit: 'inside' })
      .webp({ quality: 75 })
      .toBuffer();

    const thumbKey = `${baseKey}-thumb.webp`;
    const lowKey = `${baseKey}-low.webp`;

    await this.putObject(thumbKey, thumbnailBuffer, 'image/webp');
    await this.putObject(lowKey, lowBuffer, 'image/webp');

    await this.mediaRepo.update(media.id, {
      originalUrl: this.s3Provider.getPublicUrl(key),
      thumbnailUrl: this.s3Provider.getPublicUrl(thumbKey),
      lowUrl: this.s3Provider.getPublicUrl(lowKey),
      variants: { poster: thumbKey, low: lowKey },
    });
  }

  private async processVideo(media: Media) {
    const bucket = getS3Bucket();
    const key = media.sourceIdOrKey;
    const baseKey = key.replace(/\.[^/.]+$/, '');
    const outputPrefix = `${baseKey}/hls`;
    const mp4Key = `${outputPrefix}/stream.mp4`;
    const playlistKey = `${outputPrefix}/index.m3u8`;

    await this.transcodeMp4(bucket, key, mp4Key);
    await this.putObject(
      playlistKey,
      Buffer.from(
        [
          '#EXTM3U',
          '#EXT-X-VERSION:3',
          '#EXT-X-TARGETDURATION:10',
          '#EXT-X-MEDIA-SEQUENCE:0',
          '#EXT-X-PLAYLIST-TYPE:VOD',
          '#EXTINF:10.0,',
          'stream.mp4',
          '#EXT-X-ENDLIST',
        ].join('\n'),
      ),
      'application/vnd.apple.mpegurl',
    );

    const posterKey = `${baseKey}-poster.webp`;
    await this.generateVideoPoster(bucket, key, posterKey);

    await this.mediaRepo.update(media.id, {
      originalUrl: this.s3Provider.getPublicUrl(key),
      streamUrl: this.s3Provider.getPublicUrl(playlistKey),
      thumbnailUrl: this.s3Provider.getPublicUrl(posterKey),
      variants: { hls: playlistKey, poster: posterKey },
    });
  }

  private putObject(key: string, body: Buffer, contentType: string) {
    return getS3Client()
      .putObject({
        Bucket: getS3Bucket(),
        Key: key,
        Body: body,
        ContentType: contentType,
      })
      .promise();
  }

  private transcodeMp4(
    bucket: string,
    inputKey: string,
    outputKey: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const inputStream = getS3Client()
        .getObject({ Bucket: bucket, Key: inputKey })
        .createReadStream();
      const chunks: Buffer[] = [];
      const outputStream = new PassThrough();

      outputStream.on('data', (chunk: Buffer) => chunks.push(chunk));

      ffmpeg(inputStream)
        .videoCodec('libx264')
        .audioCodec('aac')
        .size('?x720')
        .format('mp4')
        .outputOptions('-movflags frag_keyframe+empty_moov')
        .on('error', reject)
        .pipe(outputStream, { end: true });

      outputStream.on('end', async () => {
        try {
          await this.putObject(
            outputKey,
            Buffer.concat(chunks),
            'video/mp4',
          );
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private generateVideoPoster(
    bucket: string,
    inputKey: string,
    posterKey: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const inputStream = getS3Client()
        .getObject({ Bucket: bucket, Key: inputKey })
        .createReadStream();
      const chunks: Buffer[] = [];
      const outputStream = new PassThrough();

      outputStream.on('data', (chunk: Buffer) => chunks.push(chunk));

      ffmpeg(inputStream)
        .screenshots({
          timestamps: ['1'],
          count: 1,
        })
        .on('error', async () => {
          try {
            const placeholder = await sharp({
              create: {
                width: 640,
                height: 360,
                channels: 3,
                background: { r: 20, g: 20, b: 20 },
              },
            })
              .webp()
              .toBuffer();
            await this.putObject(posterKey, placeholder, 'image/webp');
            resolve();
          } catch (error) {
            reject(error);
          }
        });

      outputStream.on('end', async () => {
        try {
          const poster = await sharp(Buffer.concat(chunks))
            .resize(640, 360, { fit: 'cover' })
            .webp()
            .toBuffer();
          await this.putObject(posterKey, poster, 'image/webp');
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }
}
