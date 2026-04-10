import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { FollowsService } from '../engagements/services/follows.services';
import { Follow } from '../engagements/entities/follow.entity';
import { FeedService } from '../feeds/feed.service';
import { Post } from '../posts/entities/post.entity';
import { Ad } from '../ads/entities/ads.entity';
import { AccountActivityModule } from '../account-activity/account-activity.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  controllers: [UserController],
  providers: [UserService, FollowsService, FeedService],
  exports: [UserService],
  imports: [
    TypeOrmModule.forFeature([User, Follow, Post, Ad]),
    AccountActivityModule,
    NotificationModule,
  ],
})
export class UserModule {}
