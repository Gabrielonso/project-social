import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { User } from 'src/modules/user/entity/user.entity';
import { successResponse } from 'src/common/helpers/response.helper';
import { Block } from '../entities/block.entity';

@Injectable()
export class BlocksService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    @InjectRepository(Block)
    private readonly blockRepo: Repository<Block>,
  ) {}

  async blockUser(currentUserId: string, targetUserId: string) {
    try {
      if (currentUserId === targetUserId) {
        throw new BadRequestException('You cannot block yourself');
      }

      return this.dataSource.transaction(async (manager) => {
        const targetUser = await manager.findOne(User, {
          where: { id: targetUserId },
        });

        if (!targetUser) {
          throw new NotFoundException('User not found');
        }

        const existing = await manager.findOne(Block, {
          where: {
            blockerId: currentUserId,
            blockedId: targetUserId,
          },
        });

        if (existing) {
          return successResponse('You have already blocked this user');
        }

        const follow = manager.create(Block, {
          blockerId: currentUserId,
          blockedId: targetUserId,
        });

        await manager.save(follow);

        return successResponse('Successfully blocked user');
      });
    } catch (error) {
      throw error;
    }
  }

  async unBlockUser(currentUserId: string, targetUserId: string) {
    try {
      if (currentUserId === targetUserId) {
        throw new BadRequestException('You cannot unblock yourself');
      }

      return this.dataSource.transaction(async (manager) => {
        const existing = await manager.findOne(Block, {
          where: {
            blockerId: currentUserId,
            blockedId: targetUserId,
          },
        });

        if (!existing) {
          return successResponse('This user is not on your blocked list');
        }

        await manager.remove(existing);

        return successResponse('Successfully unblocked user');
      });
    } catch (error) {
      throw error;
    }
  }

  async getBlockedUsers(userId: string) {
    try {
      const blocked = await this.blockRepo.find({
        where: { blockerId: userId },
      });

      if (!blocked.length) {
        return successResponse('Successfully fetched blocked users', []);
      }

      const blockedUsersIds = [...new Set(blocked.map((f) => f.blockedId))];

      const blockedUsers = await this.userRepo.find({
        where: { id: In(blockedUsersIds) },
      });

      return successResponse(
        'Successfully fetched blocked users',
        blockedUsers,
      );
    } catch (error) {
      throw error;
    }
  }
}
