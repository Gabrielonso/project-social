import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostAnalyticsService } from './post-analytics.service';
import { PostController } from './post.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { PostView } from './entities/post-view.entity';
import { Ad } from '../ads/entities/ads.entity';
import { AccountActivityModule } from '../account-activity/account-activity.module';
import { NotificationModule } from '../notification/notification.module';
import { FeedModule } from '../feeds/feed.module';
import { MediaModule } from '../media/media.module';

@Module({
  providers: [PostService, PostAnalyticsService],
  controllers: [PostController],
  imports: [
    TypeOrmModule.forFeature([Post, PostView, Ad]),
    AccountActivityModule,
    NotificationModule,
    FeedModule,
    MediaModule,
  ],
})
export class PostModule {}
