import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Status } from './entities/status.entity';
import { CreateStatusDto } from './dtos/create-status.dto';
import { StatusType } from './enums/status-type.enum';
import { Media } from '../media/entities/media.entity';
import { User } from '../user/entity/user.entity';
import { StatusFilterDto } from './dtos/status-filter.dto';
import { Follow } from '../engagements/entities/follow.entity';

@Injectable()
export class StatusService {
  constructor(
    @InjectRepository(Status) private readonly statusRepo: Repository<Status>,
    @InjectRepository(Media) private readonly mediaRepo: Repository<Media>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Follow) private readonly followRepo: Repository<Follow>,
  ) {}

  private getExpiryDate(hours = 24) {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  async create(dto: CreateStatusDto, ownerId: string) {
    if (!dto.content && !dto.mediaId) {
      throw new BadRequestException(
        'Provide at least one of: content, mediaId',
      );
    }

    const owner = await this.userRepo.findOne({ where: { id: ownerId } });
    if (!owner) throw new NotFoundException('User not found');

    const status = this.statusRepo.create({
      ownerId,
      ownerUsername: owner.username,
      ownerAvatar: owner.profilePicture,
      content: dto.content?.trim() || undefined,
      type: dto.content ? StatusType.THOUGHT : StatusType.MEDIA,
      expiresAt: this.getExpiryDate(24),
    });

    if (dto.mediaId) {
      const media = await this.mediaRepo.findOne({
        where: { id: dto.mediaId },
      });
      if (!media) throw new NotFoundException('Media not found');
      status.media = media;
      status.type = dto.content ? StatusType.THOUGHT : StatusType.MEDIA;
    }

    return this.statusRepo.save(status);
  }

  async getMyActive(ownerId: string, filter: StatusFilterDto) {
    return this.getActiveByOwner(ownerId, filter);
  }

  async getActiveByOwner(ownerId: string, filter: StatusFilterDto) {
    const page = Number(filter.page || 1);
    const limit = Number(filter.limit || 20);
    const skip = (page - 1) * limit;

    const [items, total] = await this.statusRepo.findAndCount({
      where: { ownerId },
      relations: { media: true },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const now = new Date();
    const active = items.filter((s) => s.expiresAt > now);

    return {
      page,
      limit,
      total,
      items: active,
    };
  }

  async getFeed(ownerId: string, filter: StatusFilterDto) {
    const page = Number(filter.page || 1);
    const limit = Number(filter.limit || 20);
    const skip = (page - 1) * limit;

    const follows = await this.followRepo.find({
      where: { followerId: ownerId },
      select: ['followingId'],
    });

    const ids = Array.from(
      new Set([ownerId, ...follows.map((f) => f.followingId)]),
    );
    const now = new Date();

    const [items, total] = await this.statusRepo.findAndCount({
      where: { ownerId: In(ids) },
      relations: { media: true },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      page,
      limit,
      total,
      items: items.filter((s) => s.expiresAt > now),
    };
  }

  async delete(statusId: string, ownerId: string) {
    const status = await this.statusRepo.findOne({
      where: { id: statusId, ownerId },
    });
    if (!status) throw new NotFoundException('Status not found');
    await this.statusRepo.softRemove(status);
    return { success: true };
  }
}
