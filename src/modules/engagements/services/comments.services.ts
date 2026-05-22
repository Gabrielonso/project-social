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
import { NotificationDispatcher } from 'src/modules/notification/notification.dispatcher';
import { NotificationEventType } from 'src/modules/notification/interfaces/notification-event.types';
import { UserDisplayService } from 'src/modules/user/user-display.service';
import {
  collectUserIds,
  resolveUserDisplay,
} from 'src/modules/user/helpers/user-display.helper';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    private readonly dataSource: DataSource,
    private readonly notificationDispatcher: NotificationDispatcher,
    private readonly userDisplayService: UserDisplayService,
  ) {}

  private async enrichComments(comments: Comment[]) {
    const userIds = collectUserIds(
      comments.map((comment) => comment.userId),
      comments.map((comment) => comment.replyToUserId),
    );
    const displayMap = await this.userDisplayService.getByIds(userIds);

    return comments.map((comment) => ({
      ...comment,
      author: resolveUserDisplay(displayMap, comment.userId)!,
      ...(comment.replyToUserId
        ? {
            replyTo: resolveUserDisplay(displayMap, comment.replyToUserId),
          }
        : {}),
    }));
  }

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
        });

        await manager.save(comment);

        await this.incrementCommentCounter(manager, dto.entity, dto.entityId);

        await this.notifyFeedComment(
          manager,
          dto.entity,
          dto.entityId,
          userId,
          user.username,
        );

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

      return successResponse(
        'Operation successful',
        await this.enrichComments(comments),
      );
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
          select: ['id', 'username'],
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
          content,
          replyToUserId: repliedComment.userId,
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

        await this.notificationDispatcher.notify({
          event: NotificationEventType.COMMENT_REPLY,
          recipientId: repliedComment.userId,
          actorId: userId,
          context: {
            actorUsername: user.username,
            entity: repliedComment.entity,
            entityId: repliedComment.entityId,
            commentId: repliedComment.id,
          },
        });

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
      return successResponse(
        'Operation successful',
        await this.enrichComments(replies),
      );
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

  private async notifyFeedComment(
    manager: EntityManager,
    entity: FeedType,
    entityId: string,
    userId: string,
    commenterUsername?: string,
  ) {
    const event = this.notificationDispatcher.eventForFeedComment(entity);
    if (!event) return;

    let ownerId: string | undefined;
    if (entity === FeedType.POST) {
      const post = await manager.getRepository(Post).findOne({
        where: { id: entityId },
        select: ['id', 'ownerId'],
      });
      ownerId = post?.ownerId;
    } else if (entity === FeedType.AD) {
      const ad = await manager.getRepository(Ad).findOne({
        where: { id: entityId },
        select: ['id', 'ownerId'],
      });
      ownerId = ad?.ownerId;
    }

    if (!ownerId || ownerId === userId) return;

    await this.notificationDispatcher.notify({
      event,
      recipientId: ownerId,
      actorId: userId,
      context: {
        actorUsername: commenterUsername,
        entity,
        entityId,
      },
    });
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
