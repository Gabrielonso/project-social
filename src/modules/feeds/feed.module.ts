import { Module, forwardRef } from '@nestjs/common';
import { FeedService } from './feed.service';
import { FeedController } from './feed.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from 'src/modules/posts/entities/post.entity';
import { Ad } from 'src/modules/ads/entities/ads.entity';
import { Follow } from 'src/modules/engagements/entities/follow.entity';
import { FeedCacheInvalidationService } from './feed-cache-invalidation.service';
import { FeedRankingService } from './feed-ranking.service';
import { UserDisplayModule } from '../user/user-display.module';
import { MediaModule } from '../media/media.module';

@Module({
  providers: [FeedService, FeedCacheInvalidationService, FeedRankingService],
  controllers: [FeedController],
  imports: [
    TypeOrmModule.forFeature([Post, Ad, Follow]),
    UserDisplayModule,
    forwardRef(() => MediaModule),
  ],
  exports: [FeedService, FeedCacheInvalidationService],
})
export class FeedModule {}
