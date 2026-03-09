import { Module } from '@nestjs/common';
import { TrendsController } from './trends.controller';
import { TrendsService } from './trends.service';
import { FeedModule } from '../feeds/feed.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from '../posts/entities/post.entity';
import { Ad } from '../ads/entities/ads.entity';
import { SoundsModule } from '../sounds/sounds.module';

@Module({
  imports: [FeedModule, SoundsModule, TypeOrmModule.forFeature([Post, Ad])],
  controllers: [TrendsController],
  providers: [TrendsService],
})
export class TrendsModule {}
