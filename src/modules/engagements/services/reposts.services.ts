import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { NotificationEventType } from 'src/modules/notification/interfaces/notification-event.types';
import { Repost } from '../entities/repost.entity';
import { FeedType } from 'src/modules/feeds/enums/feed-type.enum';
import { Post } from 'src/modules/posts/entities/post.entity';
import { ContentPublishStatus } from 'src/modules/media/enums/content-publish-status.enum';
import { successResponse } from 'src/common/helpers/response.helper';
import { NotificationDispatcher } from 'src/modules/notification/notification.dispatcher';
import { User } from 'src/modules/user/entity/user.entity';
import { UserDisplayService } from 'src/modules/user/user-display.service';

@Injectable()
export class RepostsService {
  constructor(
    @InjectRepository(Repost)
    private readonly repostRepo: Repository<Repost>,
    private readonly dataSource: DataSource,
    private readonly notificationDispatcher: NotificationDispatcher,
    private readonly userDisplayService: UserDisplayService,
  ) {}

  async toggleRepost(postId: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const post = await manager.findOne(Post, { where: { id: postId } });
      if (!post) {
        throw new NotFoundException('Post not found');
      }
      if (post.publishStatus !== ContentPublishStatus.PUBLISHED) {
        throw new NotFoundException('Post not found');
      }

      const existing = await manager.findOne(Repost, {
        where: { postId, userId },
      });

      let message: string;
      let reposted: boolean;
      if (existing) {
        await manager.remove(existing);
        await manager.decrement(Post, { id: postId }, 'repostCount', 1);
        reposted = false;
        message = 'Successfully removed repost';
      } else {
        const repost = manager.create(Repost, { postId, userId });
        await manager.save(repost);
        await manager.increment(Post, { id: postId }, 'repostCount', 1);
        await this.notifyRepost(manager, post.ownerId, postId, userId);
        reposted = true;
        message = 'Successfully reposted post';
      }

      return successResponse(message, { reposted });
    });
  }

  async getReposters(postId: string, page = 1, limit = 20) {
    const post = await this.repostRepo.manager.findOne(Post, {
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const skip = (page - 1) * limit;
    const [reposts, total] = await this.repostRepo.findAndCount({
      where: { postId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const displayMap = await this.userDisplayService.getByIds(
      reposts.map((r) => r.userId),
    );

    const data = reposts.map((r) => ({
      user: displayMap.get(r.userId) ?? { userId: r.userId },
      repostedAt: r.createdAt,
    }));

    return successResponse('Operation successful', {
      currentPage: page,
      data,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  }

  private async notifyRepost(
    manager: EntityManager,
    ownerId: string | undefined,
    postId: string,
    userId: string,
  ) {
    if (!ownerId || ownerId === userId) return;

    const reposter = await manager.getRepository(User).findOne({
      where: { id: userId },
      select: ['id', 'username'],
    });

    await this.notificationDispatcher.notify({
      event: NotificationEventType.POST_REPOSTED,
      recipientId: ownerId,
      actorId: userId,
      context: {
        actorUsername: reposter?.username,
        entity: FeedType.POST,
        entityId: postId,
      },
    });
  }
}
