import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Like } from '../entities/like.entity';
import { FeedType } from 'src/modules/feeds/enums/feed-type.enum';
import { Post } from 'src/modules/posts/entities/post.entity';
import { Ad } from 'src/modules/ads/entities/ads.entity';
import { successResponse } from 'src/common/helpers/response.helper';

@Injectable()
export class LikesService {
  constructor(
    @InjectRepository(Like)
    private readonly likeRepo: Repository<Like>,
    private readonly dataSource: DataSource,
  ) {}

  async toggleLike(entity: FeedType, entityId: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
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
}
