import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Follow } from '../entities/follow.entity';
import { User } from 'src/modules/user/entity/user.entity';
import { successResponse } from 'src/common/helpers/response.helper';
import { FeedFilterDto } from 'src/modules/feeds/dtos/feed-filter.dto';
import { AccountActivityService } from 'src/modules/account-activity/account-activity.service';
import { NotificationDispatcher } from 'src/modules/notification/notification.dispatcher';
import { NotificationEventType } from 'src/modules/notification/interfaces/notification-event.types';
import { FeedCacheInvalidationService } from 'src/modules/feeds/feed-cache-invalidation.service';

@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(Follow)
    private readonly followRepo: Repository<Follow>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly accountActivityService: AccountActivityService,
    private readonly notificationDispatcher: NotificationDispatcher,
    private readonly feedCacheInvalidation: FeedCacheInvalidationService,
  ) {}

  async followUser(currentUserId: string, targetUserId: string) {
    try {
      if (currentUserId === targetUserId) {
        throw new BadRequestException('You cannot follow yourself');
      }

      return this.dataSource.transaction(async (manager) => {
        const targetUser = await manager.findOne(User, {
          where: { id: targetUserId },
        });

        if (!targetUser) {
          throw new NotFoundException('User not found');
        }

        const existing = await manager.findOne(Follow, {
          where: {
            followerId: currentUserId,
            followingId: targetUserId,
          },
        });

        if (existing) {
          return successResponse('You are already following this user');
        }

        const follow = manager.create(Follow, {
          followerId: currentUserId,
          followingId: targetUserId,
        });

        await manager.save(follow);

        await this.accountActivityService.log({
          userId: currentUserId,
          action: 'user.followed',
          metadata: { targetUserId },
        });

        const follower = await manager.getRepository(User).findOne({
          where: { id: currentUserId },
          select: ['id', 'username'],
        });

        await this.notificationDispatcher.notify({
          event: NotificationEventType.FOLLOW,
          recipientId: targetUserId,
          actorId: currentUserId,
          context: { actorUsername: follower?.username },
        });

        await this.feedCacheInvalidation.invalidatePublicFeedListCaches();

        return successResponse('Successfully followed user');
      });
    } catch (error) {
      throw error;
    }
  }

  async unfollowUser(currentUserId: string, targetUserId: string) {
    try {
      if (currentUserId === targetUserId) {
        throw new BadRequestException('You cannot unfollow yourself');
      }

      return this.dataSource.transaction(async (manager) => {
        const existing = await manager.findOne(Follow, {
          where: {
            followerId: currentUserId,
            followingId: targetUserId,
          },
        });

        if (!existing) {
          return successResponse('You are not following this user');
        }

        await manager.remove(existing);

        await this.accountActivityService.log({
          userId: currentUserId,
          action: 'user.unfollowed',
          metadata: { targetUserId },
        });

        await this.feedCacheInvalidation.invalidatePublicFeedListCaches();

        return successResponse('Successfully unfollowed user');
      });
    } catch (error) {
      throw error;
    }
  }

  async getFollowers(userId: string) {
    try {
      const follows = await this.followRepo.find({
        where: { followingId: userId },
      });

      if (!follows.length) {
        return successResponse('Successfully fetched followers', []);
      }

      const followerIds = [...new Set(follows.map((f) => f.followerId))];

      const followers = await this.userRepo.find({
        where: { id: In(followerIds) },
      });

      return successResponse('Successfully fetched followers', followers);
    } catch (error) {
      throw error;
    }
  }

  async getFollowing(userId: string) {
    try {
      const follows = await this.followRepo.find({
        where: { followerId: userId },
      });

      if (!follows.length) {
        return successResponse('Successfully fetched following', []);
      }

      const followingIds = [...new Set(follows.map((f) => f.followingId))];

      const following = await this.userRepo.find({
        where: { id: In(followingIds) },
      });

      return successResponse('Successfully fetched following', following);
    } catch (error) {
      throw error;
    }
  }

  async getFriends(userId: string) {
    try {
      const [followingRelations, followerRelations] = await Promise.all([
        this.followRepo.find({ where: { followerId: userId } }),
        this.followRepo.find({ where: { followingId: userId } }),
      ]);

      if (!followingRelations.length || !followerRelations.length) {
        return successResponse('Successfully fetched friends', []);
      }

      const followingIds = new Set(
        followingRelations.map((relation) => relation.followingId),
      );
      const followerIds = new Set(
        followerRelations.map((relation) => relation.followerId),
      );

      const friendIds = [...followingIds].filter((id) => followerIds.has(id));

      if (!friendIds.length) {
        return successResponse('Successfully fetched friends', []);
      }

      const friends = await this.userRepo.find({
        where: { id: In(friendIds) },
      });

      return successResponse('Successfully fetched friends', friends);
    } catch (error) {
      throw error;
    }
  }

  async getUserFollowers(
    userId: string,
    filter: FeedFilterDto,
    authUserId?: string,
  ) {
    try {
      const page = Number(filter?.page) || 1;
      const limit = Number(filter?.limit) || 20;
      const offset = (page - 1) * limit;

      const [follows, total] = await this.followRepo.findAndCount({
        where: { followingId: userId },
        skip: offset,
        take: limit,
        order: { createdAt: 'DESC' } as any,
      });

      if (!follows.length) {
        return successResponse('Operation Successful', {
          data: [],
          currentPage: page,
          totalPages: 1,
        });
      }

      const followerIds = [...new Set(follows.map((f) => f.followerId))];

      const followers = await this.userRepo.find({
        where: { id: In(followerIds) },
      });

      let data: Array<User & { iFollow?: boolean }> = followers;

      if (authUserId) {
        const authFollows = await this.followRepo.find({
          where: {
            followerId: authUserId,
            followingId: In(followerIds),
          },
          select: ['followingId'],
        });
        const followingSet = new Set(authFollows.map((f) => f.followingId));
        data = followers.map((user) => ({
          ...user,
          iFollow: followingSet.has(user.id),
        }));
      }

      return successResponse('Operation Successful', {
        data,
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      });
    } catch (error) {
      throw error;
    }
  }

  async getUserFollowing(
    userId: string,
    filter: FeedFilterDto,
    authserId?: string,
  ) {
    try {
      const page = Number(filter?.page) || 1;
      const limit = Number(filter?.limit) || 20;
      const offset = (page - 1) * limit;

      const [follows, total] = await this.followRepo.findAndCount({
        where: { followerId: userId },
        skip: offset,
        take: limit,
        order: { createdAt: 'DESC' } as any,
      });

      if (!follows.length) {
        return successResponse('Operation Successful', {
          data: [],
          currentPage: page,
          totalPages: 1,
        });
      }

      const followingIds = [...new Set(follows.map((f) => f.followingId))];

      const following = await this.userRepo.find({
        where: { id: In(followingIds) },
      });

      return successResponse('Operation Successful', {
        data: following,
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      });
    } catch (error) {
      throw error;
    }
  }
}
