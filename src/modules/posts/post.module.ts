import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { Ad } from '../ads/entities/ads.entity';
import { AccountActivityModule } from '../account-activity/account-activity.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  providers: [PostService],
  controllers: [PostController],
  imports: [
    TypeOrmModule.forFeature([Post, Ad]),
    AccountActivityModule,
    NotificationModule,
  ],
})
export class PostModule {}
