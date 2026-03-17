import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Comment } from '../entities/comment.entity';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { CreateCommentDto } from '../dtos/create-comment.dto';
import { FeedType } from 'src/modules/feeds/enums/feed-type.enum';
import { Ad } from 'src/modules/ads/entities/ads.entity';
import { successResponse } from 'src/common/helpers/response.helper';
import { Post } from 'src/modules/posts/entities/post.entity';
import { User } from 'src/modules/user/entity/user.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    private readonly dataSource: DataSource,
  ) {}

  async createComment(dto: CreateCommentDto, userId: string) {
    try {
      return this.dataSource.transaction(async (manager) => {
        await this.validateFeedEntity(manager, dto.entity, dto.entityId);
        const userRepo = manager.getRepository(User);
        const user = await userRepo.findOne({
          where: { id: userId },
          select: ['id', 'username', 'profilePicture'],
        });
        if (!user) {
          throw new HttpException(
            {
              statusCode: HttpStatus.NOT_FOUND,
              message: 'User not found',
            },
            HttpStatus.NOT_FOUND,
          );
        }
        const comment = manager.create(Comment, {
          ...dto,
          userId,
          username: user.username,
          userAvatar: user.profilePicture,
        });

        await manager.save(comment);

        await this.incrementCommentCounter(manager, dto.entity, dto.entityId);

        return successResponse(`Successfully commented on ${dto.entity}`);
      });
    } catch (error) {
      throw error;
    }
  }

  async getComments(entity: FeedType, entityId: string) {
    try {
      const comments = await this.commentRepo.find({
        where: {
          entity,
          entityId,
          parentId: IsNull(),
          isDeleted: false,
        },
        order: { createdAt: 'DESC' },
      });

      return successResponse('Operation successful', comments);
    } catch (error) {
      throw error;
    }
  }

  async replyToComment(
    replyToCommentId: string,
    content: string,
    userId: string,
  ) {
    try {
      return this.dataSource.transaction(async (manager) => {
        const commentRepo = manager.getRepository(Comment);
        const repliedComment = await commentRepo.findOneBy({
          id: replyToCommentId,
        });

        if (!repliedComment) {
          throw new NotFoundException('Comment not found');
        }

        const parentId = repliedComment.parentId ?? repliedComment.id;
        const userRepo = manager.getRepository(User);
        const user = await userRepo.findOne({
          where: { id: userId },
          select: ['id', 'username', 'profilePicture'],
        });
        if (!user) {
          throw new HttpException(
            {
              statusCode: HttpStatus.NOT_FOUND,
              message: 'User not found',
            },
            HttpStatus.NOT_FOUND,
          );
        }

        await commentRepo.save({
          entity: repliedComment.entity,
          entityId: repliedComment.entityId,
          parentId,
          userId,
          username: user.username,
          userAvatar: user.profilePicture,
          content,
          replyToUserId: repliedComment.userId,
          replyToUsername: repliedComment.username,
          replyToUserAvatar: repliedComment.userAvatar,
          replyToCommentId: repliedComment.id,
        });
        if (repliedComment?.parentId) {
          await this.incrementCommentReplyCounter(
            manager,
            repliedComment?.parentId,
          );
        }

        if (repliedComment?.id) {
          await this.incrementCommentReplyCounter(manager, repliedComment?.id);
        }

        await this.incrementCommentCounter(
          manager,
          repliedComment.entity,
          repliedComment.entityId,
        );
        return successResponse('Successfully replied comment');
      });
    } catch (error) {
      throw error;
    }
  }

  async getRepliesToComment(parentId: string) {
    try {
      const replies = await this.commentRepo.find({
        where: {
          parentId,
          isDeleted: false,
        },
        order: { createdAt: 'ASC' },
      });
      return successResponse('Operation successful', replies);
    } catch (error) {
      throw error;
    }
  }

  async deleteComment(commentId: string, userId: string, isAdmin = false) {
    try {
      return this.dataSource.transaction(async (manager) => {
        const commentRepo = manager.getRepository(Comment);
        const comment = await commentRepo.findOneBy({ id: commentId });
        if (!comment) throw new NotFoundException('Comment not found');

        if (!isAdmin && comment.userId !== userId) {
          throw new ForbiddenException();
        }

        if (comment.isDeleted) return;

        comment.isDeleted = true;
        comment.deletedAt = new Date();
        comment.deletedBy = userId;
        comment.content = '[deleted]';

        await commentRepo.save(comment);

        if (comment?.parentId) {
          await this.decrementCommentReplyCounter(manager, comment.parentId);
        }

        if (
          comment?.replyToCommentId &&
          comment?.parentId != comment?.replyToCommentId
        ) {
          await this.decrementCommentReplyCounter(
            manager,
            comment?.replyToCommentId,
          );
        }

        await this.decrementCommentCounter(
          manager,
          comment.entity,
          comment.entityId,
        );
        return successResponse('Successfully deleted comment');
      });
    } catch (error) {
      throw error;
    }
  }

  private incrementCommentCounter(
    manager: EntityManager,
    entity: FeedType,
    entityId: string,
  ) {
    if (entity === FeedType.POST) {
      return manager.increment(Post, { id: entityId }, 'commentCount', 1);
    }

    if (entity === FeedType.AD) {
      return manager.increment(Ad, { id: entityId }, 'commentCount', 1);
    }
  }

  private decrementCommentCounter(
    manager: EntityManager,
    entity: FeedType,
    entityId: string,
  ) {
    if (entity === FeedType.POST) {
      return manager.decrement(Post, { id: entityId }, 'commentCount', 1);
    }

    if (entity === FeedType.AD) {
      return manager.decrement(Ad, { id: entityId }, 'commentCount', 1);
    }
  }

  private incrementCommentReplyCounter(
    manager: EntityManager,
    commentId: string,
  ) {
    return manager.increment(Comment, { id: commentId }, 'replyCount', 1);
  }

  private decrementCommentReplyCounter(
    manager: EntityManager,
    commentId: string,
  ) {
    return manager.decrement(Comment, { id: commentId }, 'replyCount', 1);
  }

  private async validateFeedEntity(
    manager: EntityManager,
    entity: FeedType,
    entityId: string,
  ) {
    if (entity === FeedType.POST) {
      const post = await manager.findOne(Post, { where: { id: entityId } });
      if (!post) {
        throw new NotFoundException('Post not found');
      }
    }

    if (entity === FeedType.AD) {
      const ad = await manager.findOne(Ad, { where: { id: entityId } });
      if (!ad) {
        throw new NotFoundException('Ad not found');
      }
    }
  }
}
