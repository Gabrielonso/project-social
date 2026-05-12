import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, MoreThan } from 'typeorm';
import { Status } from './entities/status.entity';
import { CreateStatusDto } from './dtos/create-status.dto';
import { StatusType } from './enums/status-type.enum';
import { Media } from '../media/entities/media.entity';
import { User } from '../user/entity/user.entity';
import { StatusFilterDto } from './dtos/status-filter.dto';
import { Follow } from '../engagements/entities/follow.entity';
import { MediaUploadFolder } from '../media/enums/media-upload-folder.enum';
import { MediaProvider } from '../media/enums/media-provider.enum';
import { MediaStatus } from '../media/enums/media-status.enum';
import { successResponse } from 'src/common/helpers/response.helper';

@Injectable()
export class StatusService {
  constructor(
    @InjectRepository(Status) private readonly statusRepo: Repository<Status>,
    @InjectRepository(Media) private readonly mediaRepo: Repository<Media>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Follow) private readonly followRepo: Repository<Follow>,
    private readonly dataSource: DataSource,
  ) {}

  private getExpiryDate(hours = 24) {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  async createStatus(dto: CreateStatusDto, ownerId: string) {
    try {
      return await this.dataSource.manager.transaction(
        async (entityManager) => {
          const mediaRepo = entityManager.getRepository(Media);
          const userRepo = entityManager.getRepository(User);
          const statusRepo = entityManager.getRepository(Status);

          if (!dto.content && !dto.media) {
            throw new BadRequestException(
              'Provide at least one of: content, media',
            );
          }

          const owner = await userRepo.findOne({ where: { id: ownerId } });
          if (!owner) throw new NotFoundException('User not found');

          const status = statusRepo.create({
            ownerId,
            ownerUsername: owner.username,
            ownerAvatar: owner.profilePicture,
            content: dto.content?.trim() || undefined,
            type: dto.content ? StatusType.THOUGHT : StatusType.MEDIA,
            expiresAt: this.getExpiryDate(24),
          });

          let media: Media | null = null;
          if (dto.media) {
            const m = dto.media;

            if (
              !m.sourceIdOrKey.startsWith(
                `${MediaUploadFolder.STATUS}/${ownerId}/`,
              )
            ) {
              throw new ForbiddenException('Invalid media ownership or folder');
            }

            const isCloudinary = m.provider === MediaProvider.CLOUDINARY;

            const sound = mediaRepo.create({
              provider: m.provider,
              type: m.type,
              sourceIdOrKey: m.sourceIdOrKey,
              duration: m.duration,
              status: isCloudinary ? MediaStatus.READY : MediaStatus.PROCESSING,
              originalUrl: m.originalUrl,
              streamUrl: m.streamUrl,
              size: m.size,
            });

            media = await mediaRepo.save(sound);
            status.media = media;
            status.type = dto.content ? StatusType.THOUGHT : StatusType.MEDIA;
          }

          await statusRepo.save(status);
          return successResponse('Successfully created status');
        },
      );
    } catch (error) {
      throw error;
    }
  }

  async getMyActive(ownerId: string, filter: StatusFilterDto) {
    try {
      const data = await this.getActiveByOwner(ownerId, filter);
      return successResponse('Operation Successful', data);
    } catch (error) {
      throw error;
    }
  }

  async getActiveByOwner(ownerId: string, filter: StatusFilterDto) {
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || null;
    const skip = limit ? (page - 1) * limit : 0;

    const [items, total] = await this.statusRepo.findAndCount({
      where: { ownerId },
      order: { createdAt: 'DESC' },
      skip,
      ...(limit && { take: limit }),
    });

    const now = new Date();
    const active = items.filter((s) => s.expiresAt > now);

    return {
      currentPage: page,
      // limit,
      // total,
      data: active,
      totalPages: limit ? Math.ceil(total / limit) : 1,
    };
  }

  async getFeed(viewerId: string, filter: StatusFilterDto) {
    try {
      const page = Number(filter.page) || 1;
      const limit = Number(filter.limit) || null;
      const skip = limit ? (page - 1) * limit : 0;

      const follows = await this.followRepo.find({
        where: { followerId: viewerId },
        select: ['followingId'],
      });

      const ids = Array.from(
        new Set([viewerId, ...follows.map((f) => f.followingId)]),
      );
      const now = new Date();

      const totalOwnersRaw = await this.statusRepo
        .createQueryBuilder('s')
        .where('s.ownerId IN (:...ids)', { ids })
        .andWhere('s.expiresAt > :now', { now })
        .select('COUNT(DISTINCT s.ownerId)', 'cnt')
        .getRawOne<{ cnt: string }>();
      const totalOwners = parseInt(totalOwnersRaw?.cnt ?? '0', 10) || 0;

      const ownersQb = this.statusRepo
        .createQueryBuilder('s')
        .where('s.ownerId IN (:...ids)', { ids })
        .andWhere('s.expiresAt > :now', { now })
        .select('s.ownerId', 'ownerId')
        .addSelect('MAX(s.createdAt)', 'latest')
        .groupBy('s.ownerId')
        .orderBy('latest', 'DESC');

      if (limit) {
        ownersQb.skip(skip).take(limit);
      }

      const ownerRows = await ownersQb.getRawMany<{
        ownerId: string;
        latest: Date;
      }>();
      const orderedOwnerIds = ownerRows.map((r) => r.ownerId);

      const selfIdx = orderedOwnerIds.indexOf(viewerId);
      if (selfIdx > 0) {
        orderedOwnerIds.splice(selfIdx, 1);
        orderedOwnerIds.unshift(viewerId);
      }

      if (orderedOwnerIds.length === 0) {
        return successResponse('Operation successful', {
          currentPage: page,
          data: [],
          totalPages: limit ? Math.ceil(totalOwners / limit) || 1 : 1,
        });
      }

      const statuses = await this.statusRepo.find({
        where: { ownerId: In(orderedOwnerIds), expiresAt: MoreThan(now) },
        relations: { media: true },
        order: { createdAt: 'ASC' },
      });

      const byOwner = new Map<string, Status[]>();
      for (const s of statuses) {
        const list = byOwner.get(s.ownerId) ?? [];
        list.push(s);
        byOwner.set(s.ownerId, list);
      }

      const data = orderedOwnerIds.map((uid) => {
        const list = byOwner.get(uid) ?? [];
        const first = list[0];
        return {
          ownerId: uid,
          ownerUsername: first?.ownerUsername,
          ownerAvatar: first?.ownerAvatar,
          statuses: list,
        };
      });

      return successResponse('Operation successful', {
        currentPage: page,
        data,
        totalPages: limit ? Math.ceil(totalOwners / limit) || 1 : 1,
      });
    } catch (error) {
      throw error;
    }
  }

  async delete(statusId: string, ownerId: string) {
    try {
      const status = await this.statusRepo.findOne({
        where: { id: statusId, ownerId },
      });
      if (!status) throw new NotFoundException('Status not found');
      await this.statusRepo.softRemove(status);
      return successResponse('Successfully deleted status');
    } catch (error) {
      throw error;
    }
  }
}
