import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { NotificationEventType } from 'src/modules/notification/interfaces/notification-event.types';
import { Like } from '../entities/like.entity';
import { FeedType } from 'src/modules/feeds/enums/feed-type.enum';
import { Post } from 'src/modules/posts/entities/post.entity';
import { Ad } from 'src/modules/ads/entities/ads.entity';
import { successResponse } from 'src/common/helpers/response.helper';
import { NotificationDispatcher } from 'src/modules/notification/notification.dispatcher';
import { User } from 'src/modules/user/entity/user.entity';

@Injectable()
export class LikesService {
  constructor(
    @InjectRepository(Like)
    private readonly likeRepo: Repository<Like>,
    private readonly dataSource: DataSource,
    private readonly notificationDispatcher: NotificationDispatcher,
  ) {}

  async toggleLike(entity: FeedType, entityId: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      await this.validateFeedEntity(manager, entity, entityId);
      const existing = await manager.findOne(Like, {
        where: { entity, entityId, userId },
      });
      let message = 'Operation successful';
      if (existing) {
        await manager.remove(existing);
        await this.decrementCounter(manager, entity, entityId);

        message = `Successfully retrieved like for this ${entity}`;
      } else {
        const like = manager.create(Like, {
          entity,
          entityId,
          userId,
        });

        await manager.save(like);
        await this.incrementCounter(manager, entity, entityId);

        await this.notifyFeedLike(manager, entity, entityId, userId);

        message = `Successfully liked this ${entity}`;
      }

      return successResponse(message);
    });
  }

  private incrementCounter(
    manager: EntityManager,
    entity: FeedType,
    entityId: string,
  ) {
    if (entity === FeedType.POST) {
      return manager.increment(Post, { id: entityId }, 'likeCount', 1);
    }

    if (entity === FeedType.AD) {
      return manager.increment(Ad, { id: entityId }, 'likeCount', 1);
    }
  }

  private decrementCounter(
    manager: EntityManager,
    entity: FeedType,
    entityId: string,
  ) {
    if (entity === FeedType.POST) {
      return manager.decrement(Post, { id: entityId }, 'likeCount', 1);
    }

    if (entity === FeedType.AD) {
      return manager.decrement(Ad, { id: entityId }, 'likeCount', 1);
    }
  }

  private async notifyFeedLike(
    manager: EntityManager,
    entity: FeedType,
    entityId: string,
    userId: string,
  ) {
    const event = this.notificationDispatcher.eventForFeedLike(entity);
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

    const liker = await manager.getRepository(User).findOne({
      where: { id: userId },
      select: ['id', 'username'],
    });

    await this.notificationDispatcher.notify({
      event,
      recipientId: ownerId,
      actorId: userId,
      context: {
        actorUsername: liker?.username,
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
