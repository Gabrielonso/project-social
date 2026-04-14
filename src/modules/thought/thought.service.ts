import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { successResponse } from 'src/common/helpers/response.helper';

import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../user/entity/user.entity';

import { AccountActivityService } from '../account-activity/account-activity.service';
import { Thought } from './entities/thought.entity';
import { CreateThoughtDto } from './dtos/create-thought.dto';
import { UpdateThoughtDto } from './dtos/update-thought.dto';
import { ThoughtsFilterDto } from './dtos/thoughts-filter.dto';

@Injectable()
export class ThoughtService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Thought)
    private thoughtRepo: Repository<Thought>,
    private readonly accountActivityService: AccountActivityService,
  ) {}

  async createThought(dto: CreateThoughtDto, userId: string) {
    try {
      return await this.dataSource.manager.transaction(
        async (entityManager) => {
          const thoughtRepo = entityManager.getRepository(Thought);
          const userRepo = entityManager.getRepository(User);
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

          const thought = thoughtRepo.create({
            title: dto.title,
            content: dto.content,
            ownerId: user.id,
            ownerUsername: user.username,
            ownerAvatar: user.profilePicture,
            isPublic: dto.isPublic ?? true,
          });
          const savedThought = await thoughtRepo.save(thought);

          await this.accountActivityService.log({
            userId,
            action: 'thought.created',
            metadata: {
              thoughtId: savedThought.id,
              isPublic: savedThought.isPublic,
            },
          });

          return successResponse('Successfully created thought');
        },
      );
    } catch (error) {
      throw error;
    }
  }

  async updateThought(
    thoughtId: string,
    dto: UpdateThoughtDto,
    userId: string,
  ) {
    try {
      const thought = await this.thoughtRepo.findOne({
        where: { id: thoughtId },
      });
      if (!thought) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'Thought not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      if (thought.ownerId !== userId) {
        throw new ForbiddenException(
          'You are not allowed to edit this thought',
        );
      }

      const updatePayload: Partial<Thought> = {};
      if (dto.title !== undefined) updatePayload.title = dto.title;
      if (dto.content !== undefined) updatePayload.content = dto.content;

      if (dto.isPublic !== undefined) updatePayload.isPublic = dto.isPublic;

      await this.thoughtRepo.update({ id: thoughtId }, updatePayload);

      await this.accountActivityService.log({
        userId,
        action: 'thought.updated',
        metadata: { thoughtId },
      });

      return successResponse('Successfully updated thought');
    } catch (error) {
      throw error;
    }
  }

  async getMyThoughts(userId: string, thoughtFilterDto: ThoughtsFilterDto) {
    const page = Number(thoughtFilterDto.page) || 1;
    const limit = Number(thoughtFilterDto.limit) || 20;
    const offset = (page - 1) * limit;

    const data = await this.dataSource.query(
      `
        SELECT
          *
        FROM thoughts 
        WHERE owner_id = $1
      ORDER BY "created_at" DESC
      LIMIT $2 OFFSET $3
      `,
      [userId, limit, offset],
    );

    const total = await this.dataSource.query(
      `SELECT COUNT(id) FROM thoughts WHERE is_public = true`,
    );

    const ttl = total[0]?.count || 0;
    return successResponse('Operation Successful', {
      data,
      currentPage: page,
      totalPages: Math.ceil(ttl / limit),
    });
  }

  async getUsersThoughts(
    userId: string,
    thoughtFilterDto: ThoughtsFilterDto,
    authUserId?: string,
  ) {
    const page = Number(thoughtFilterDto.page) || 1;
    const limit = Number(thoughtFilterDto.limit) || 20;
    const offset = (page - 1) * limit;

    const data = await this.dataSource.query(
      `
        SELECT
          *
        FROM thoughts
        WHERE owner_id = $1 AND is_public = true
      ORDER BY "created_at" DESC
      LIMIT $2 OFFSET $3
      `,
      [userId, limit, offset],
    );

    const total = await this.dataSource.query(
      `SELECT COUNT(id) FROM thoughts WHERE is_public = true`,
    );

    const ttl = total[0]?.count || 0;
    return successResponse('Operation Successful', {
      data,
      currentPage: page,
      totalPages: Math.ceil(ttl / limit),
    });
  }

  async deleteThought(thoughtId: string, userId: string) {
    try {
      const thought = await this.thoughtRepo.findOne({
        where: { id: thoughtId },
      });
      if (!thought) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'Thought not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      if (thought.ownerId !== userId) {
        throw new ForbiddenException(
          'You are not allowed to delete this thought',
        );
      }

      await this.thoughtRepo.delete({ id: thoughtId });

      await this.accountActivityService.log({
        userId,
        action: 'thought.deleted',
        metadata: { thoughtId },
      });

      return successResponse('Successfully deleted thought');
    } catch (error) {
      throw error;
    }
  }
}
