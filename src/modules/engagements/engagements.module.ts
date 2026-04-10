import { TypeOrmModule } from '@nestjs/typeorm';
import { LikesService } from './services/likes.services';
import { Like } from './entities/like.entity';
import { EngagementsController } from './engagement.controller';
import { Module } from '@nestjs/common';
import { CommentsService } from './services/comments.services';
import { Comment } from './entities/comment.entity';
import { Bookmark } from './entities/bookmark.entity';
import { BookmarksService } from './services/bookmarks.services';
import { NotificationModule } from '../notification/notification.module';

@Module({
  providers: [LikesService, CommentsService, BookmarksService],
  controllers: [EngagementsController],
  imports: [
    TypeOrmModule.forFeature([Like, Comment, Bookmark]),
    NotificationModule,
  ],
})
export class EngagementsModule {}
