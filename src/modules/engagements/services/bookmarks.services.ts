import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { FeedType } from 'src/modules/feeds/enums/feed-type.enum';
import { Post } from 'src/modules/posts/entities/post.entity';
import { Ad } from 'src/modules/ads/entities/ads.entity';
import { successResponse } from 'src/common/helpers/response.helper';
import { Bookmark } from '../entities/bookmark.entity';

@Injectable()
export class BookmarksService {
  constructor(
    @InjectRepository(Bookmark)
    private readonly bookmarkRepo: Repository<Bookmark>,
    private readonly dataSource: DataSource,
  ) {}

  async toggleBookmark(entity: FeedType, entityId: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      await this.validateFeedEntity(manager, entity, entityId);
      const existing = await manager.findOne(Bookmark, {
        where: { entity, entityId, userId },
      });
      let message = 'Operation successful';
      if (existing) {
        await manager.remove(existing);
        await this.decrementCounter(manager, entity, entityId);

        message = `Successfully retrieved bookmark for this ${entity}`;
      } else {
        const bookmark = manager.create(Bookmark, {
          entity,
          entityId,
          userId,
        });

        await manager.save(bookmark);
        await this.incrementCounter(manager, entity, entityId);

        message = `Successfully bookmarked this ${entity}`;
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
      return manager.increment(Post, { id: entityId }, 'bookmarkCount', 1);
    }

    if (entity === FeedType.AD) {
      return manager.increment(Ad, { id: entityId }, 'bookmarkCount', 1);
    }
  }

  private decrementCounter(
    manager: EntityManager,
    entity: FeedType,
    entityId: string,
  ) {
    if (entity === FeedType.POST) {
      return manager.decrement(Post, { id: entityId }, 'bookmarkCount', 1);
    }

    if (entity === FeedType.AD) {
      return manager.decrement(Ad, { id: entityId }, 'bookmarkCount', 1);
    }
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
