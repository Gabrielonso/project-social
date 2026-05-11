import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { Ad } from '../ads/entities/ads.entity';
import { AccountActivityModule } from '../account-activity/account-activity.module';
import { NotificationModule } from '../notification/notification.module';
import { FeedModule } from '../feeds/feed.module';

@Module({
  providers: [PostService],
  controllers: [PostController],
  imports: [
    TypeOrmModule.forFeature([Post, Ad]),
    AccountActivityModule,
    NotificationModule,
    FeedModule,
  ],
})
export class PostModule {}
