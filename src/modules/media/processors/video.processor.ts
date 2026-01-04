import { Injectable } from '@nestjs/common';
import { Media } from '../entities/media.entity';

@Injectable()
export class VideoProcessor {
  async process(media: Media) {
    const mp4 = await this.createMp4(media.sourceIdOrKey);
    const hls = await this.createHls(media.sourceIdOrKey);
    const thumbnail = await this.createThumbnail(media.sourceIdOrKey);

    return { mp4, hls, thumbnail };
  }

  async createThumbnail(input: string) {
    // await exec(`ffmpeg -i ${input} -ss 00:00:00 -vframes 1 thumb.jpg`);
    // return uploadToS3('thumb.jpg');
  }

  async createMp4(input: string) {
    // await exec(`ffmpeg -i ${input} -vf scale=-2:720 mp4.mp4`);
    // return uploadToS3('mp4.mp4');
  }

  async createHls(input: string) {
    // await exec(`
    //   ffmpeg -i ${input}
    //   -vf scale=-2:720
    //   -hls_time 4
    //   -hls_list_size 0
    //   index.m3u8
    // `);
    // return uploadToS3('index.m3u8');
  }
}
