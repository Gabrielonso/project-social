import { Module } from '@nestjs/common';
import { FeedService } from './feed.service';
import { FeedController } from './feed.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from 'src/modules/posts/entities/post.entity';
import { Ad } from 'src/modules/ads/entities/ads.entity';
import { FeedCacheInvalidationService } from './feed-cache-invalidation.service';
import { UserDisplayModule } from '../user/user-display.module';

@Module({
  providers: [FeedService, FeedCacheInvalidationService],
  controllers: [FeedController],
  imports: [TypeOrmModule.forFeature([Post, Ad]), UserDisplayModule],
  exports: [FeedService, FeedCacheInvalidationService],
})
export class FeedModule {}
