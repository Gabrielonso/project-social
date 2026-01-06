import { TypeOrmModule } from '@nestjs/typeorm';
import { LikesService } from './services/likes.services';
import { Like } from './entities/like.entity';
import { EngagementsController } from './engagement.controller';
import { Module } from '@nestjs/common';
import { CommentsService } from './services/comments.services';
import { Comment } from './entities/comment.entity';

@Module({
  providers: [LikesService, CommentsService],
  controllers: [EngagementsController],
  imports: [TypeOrmModule.forFeature([Like, Comment])],
})
export class EngagementsModule {}
