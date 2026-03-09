import { Module } from '@nestjs/common';
import { FeedService } from './feed.service';
import { FeedController } from './feed.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from 'src/modules/posts/entities/post.entity';
import { Ad } from 'src/modules/ads/entities/ads.entity';

@Module({
  providers: [FeedService],
  controllers: [FeedController],
  imports: [TypeOrmModule.forFeature([Post, Ad])],
  exports: [FeedService],
})
export class FeedModule {}
