import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, MoreThan } from 'typeorm';
import { Status } from './entities/status.entity';
import { StatusView } from './entities/status-view.entity';
import { CreateStatusDto } from './dtos/create-status.dto';
import { StatusType } from './enums/status-type.enum';
import { Media } from '../media/entities/media.entity';
import { User } from '../user/entity/user.entity';
import { StatusFilterDto } from './dtos/status-filter.dto';
import { StatusViewsFilterDto } from './dtos/status-views-filter.dto';
import { Follow } from '../engagements/entities/follow.entity';
import { MediaUploadFolder } from '../media/enums/media-upload-folder.enum';
import { MediaProvider } from '../media/enums/media-provider.enum';
import { MediaStatus } from '../media/enums/media-status.enum';
import { successResponse } from 'src/common/helpers/response.helper';
import { StatusCleanupService } from './status-cleanup.service';

export type StatusWithViewMeta = Status & {
  viewedByMe: boolean;
  viewCount?: number;
};

export type StatusFeedGroup = {
  ownerId: string;
  ownerUsername?: string;
  ownerAvatar?: string;
  hasUnseenStatuses: boolean;
  statuses: StatusWithViewMeta[];
};

@Injectable()
export class StatusService {
  constructor(
    @InjectRepository(Status) private readonly statusRepo: Repository<Status>,
    @InjectRepository(StatusView)
    private readonly statusViewRepo: Repository<StatusView>,
    @InjectRepository(Media) private readonly mediaRepo: Repository<Media>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Follow) private readonly followRepo: Repository<Follow>,
    private readonly dataSource: DataSource,
    private readonly statusCleanup: StatusCleanupService,
  ) {}

  private getExpiryDate(hours = 24) {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  private async getFeedOwnerIds(viewerId: string): Promise<string[]> {
    const follows = await this.followRepo.find({
      where: { followerId: viewerId },
      select: ['followingId'],
    });
    return Array.from(new Set(follows.map((f) => f.followingId)));
  }

  private async canViewStatus(
    status: Status,
    viewerId: string,
  ): Promise<boolean> {
    const now = new Date();
    if (status.expiresAt <= now) return false;
    if (status.ownerId === viewerId) return true;
    const follow = await this.followRepo.findOne({
      where: { followerId: viewerId, followingId: status.ownerId },
    });
    return !!follow;
  }

  private async getViewedStatusIds(
    statusIds: string[],
    viewerId: string,
  ): Promise<Set<string>> {
    if (statusIds.length === 0) return new Set();
    const views = await this.statusViewRepo.find({
      where: { statusId: In(statusIds), viewerId },
      select: ['statusId'],
    });
    return new Set(views.map((v) => v.statusId));
  }

  /** Tray: unseen owners by latest activity, then seen owners by latest (no self pin). */
  private sortFeedOwnerIds(
    ownerRows: { ownerId: string; latest: Date | string }[],
    unseenOwners: Set<string>,
  ): string[] {
    const byLatestDesc = (
      a: { ownerId: string; latest: Date | string },
      b: { ownerId: string; latest: Date | string },
    ) =>
      new Date(b.latest).getTime() - new Date(a.latest).getTime();

    const unseen = ownerRows
      .filter((r) => unseenOwners.has(r.ownerId))
      .sort(byLatestDesc);
    const seen = ownerRows
      .filter((r) => !unseenOwners.has(r.ownerId))
      .sort(byLatestDesc);

    return [
      ...unseen.map((r) => r.ownerId),
      ...seen.map((r) => r.ownerId),
    ];
  }

  private async getUnseenOwnerIds(
    ownerIds: string[],
    viewerId: string,
    now: Date,
  ): Promise<Set<string>> {
    if (ownerIds.length === 0) return new Set();
    const rows = await this.statusRepo
      .createQueryBuilder('s')
      .leftJoin(
        'status_views',
        'v',
        'v.status_id = s.id AND v.viewer_id = :viewerId',
        { viewerId },
      )
      .where('s.ownerId IN (:...ownerIds)', { ownerIds })
      .andWhere('s.expiresAt > :now', { now })
      .andWhere('v.id IS NULL')
      .select('DISTINCT s.ownerId', 'ownerId')
      .getRawMany<{ ownerId: string }>();
    return new Set(rows.map((r) => r.ownerId));
  }

  private async getViewCounts(
    statusIds: string[],
  ): Promise<Map<string, number>> {
    if (statusIds.length === 0) return new Map();
    const rows = await this.statusViewRepo
      .createQueryBuilder('v')
      .select('v.status_id', 'statusId')
      .addSelect('COUNT(*)', 'count')
      .where('v.status_id IN (:...statusIds)', { statusIds })
      .groupBy('v.status_id')
      .getRawMany<{ statusId: string; count: string }>();
    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(r.statusId, parseInt(r.count, 10) || 0);
    }
    return map;
  }

  private enrichStatuses(
    statuses: Status[],
    viewedSet: Set<string>,
    viewCounts?: Map<string, number>,
  ): StatusWithViewMeta[] {
    return statuses.map((s) => ({
      ...s,
      viewedByMe: viewedSet.has(s.id),
      ...(viewCounts && { viewCount: viewCounts.get(s.id) ?? 0 }),
    }));
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
      const data = await this.getActiveByOwner(ownerId, filter, ownerId);
      return successResponse('Operation Successful', data);
    } catch (error) {
      throw error;
    }
  }

  async getActiveByOwner(
    ownerId: string,
    filter: StatusFilterDto,
    viewerId?: string,
  ) {
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || null;
    const skip = limit ? (page - 1) * limit : 0;

    const [items, total] = await this.statusRepo.findAndCount({
      where: { ownerId },
      relations: { media: true },
      order: { createdAt: 'ASC' },
      skip,
      ...(limit && { take: limit }),
    });

    const now = new Date();
    const active = items.filter((s) => s.expiresAt > now);

    let data: StatusWithViewMeta[];
    if (viewerId) {
      const viewedSet = await this.getViewedStatusIds(
        active.map((s) => s.id),
        viewerId,
      );
      const viewCounts =
        viewerId === ownerId
          ? await this.getViewCounts(active.map((s) => s.id))
          : undefined;
      data = this.enrichStatuses(active, viewedSet, viewCounts);
    } else {
      data = active.map((s) => ({ ...s, viewedByMe: false }));
    }

    return {
      currentPage: page,
      data,
      totalPages: limit ? Math.ceil(total / limit) : 1,
    };
  }

  async getFeed(viewerId: string, filter: StatusFilterDto) {
    try {
      const page = Number(filter.page) || 1;
      const limit = Number(filter.limit) || null;
      const skip = limit ? (page - 1) * limit : 0;

      const ids = await this.getFeedOwnerIds(viewerId);
      const now = new Date();

      const totalOwnersRaw = await this.statusRepo
        .createQueryBuilder('s')
        .where('s.ownerId IN (:...ids)', { ids })
        .andWhere('s.expiresAt > :now', { now })
        .select('COUNT(DISTINCT s.ownerId)', 'cnt')
        .getRawOne<{ cnt: string }>();
      const totalOwners = parseInt(totalOwnersRaw?.cnt ?? '0', 10) || 0;

      const ownerRows = await this.statusRepo
        .createQueryBuilder('s')
        .where('s.ownerId IN (:...ids)', { ids })
        .andWhere('s.expiresAt > :now', { now })
        .select('s.ownerId', 'ownerId')
        .addSelect('MAX(s.createdAt)', 'latest')
        .groupBy('s.ownerId')
        .getRawMany<{ ownerId: string; latest: Date }>();

      const allOwnerIds = ownerRows.map((r) => r.ownerId);
      const unseenOwners = await this.getUnseenOwnerIds(
        allOwnerIds,
        viewerId,
        now,
      );

      const sortedOwnerIds = this.sortFeedOwnerIds(ownerRows, unseenOwners);
      const orderedOwnerIds = limit
        ? sortedOwnerIds.slice(skip, skip + limit)
        : sortedOwnerIds;

      if (orderedOwnerIds.length === 0) {
        return successResponse('Operation successful', {
          currentPage: page,
          data: [] as StatusFeedGroup[],
          totalPages: limit ? Math.ceil(totalOwners / limit) || 1 : 1,
        });
      }

      const statuses = await this.statusRepo.find({
        where: { ownerId: In(orderedOwnerIds), expiresAt: MoreThan(now) },
        relations: { media: true },
        order: { createdAt: 'ASC' },
      });

      const statusIds = statuses.map((s) => s.id);
      const viewedSet = await this.getViewedStatusIds(statusIds, viewerId);

      const byOwner = new Map<string, Status[]>();
      for (const s of statuses) {
        const list = byOwner.get(s.ownerId) ?? [];
        list.push(s);
        byOwner.set(s.ownerId, list);
      }

      const data: StatusFeedGroup[] = orderedOwnerIds.map((uid) => {
        const list = byOwner.get(uid) ?? [];
        const first = list[0];
        return {
          ownerId: uid,
          ownerUsername: first?.ownerUsername,
          ownerAvatar: first?.ownerAvatar,
          hasUnseenStatuses: unseenOwners.has(uid),
          statuses: this.enrichStatuses(list, viewedSet),
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

  async markView(statusId: string, viewerId: string) {
    const status = await this.statusRepo.findOne({
      where: { id: statusId },
    });
    if (!status) throw new NotFoundException('Status not found');

    if (!(await this.canViewStatus(status, viewerId))) {
      throw new ForbiddenException('You cannot view this status');
    }

    if (status.ownerId === viewerId) {
      return successResponse('View recorded', { viewedByMe: true });
    }

    await this.statusViewRepo.upsert(
      { statusId, viewerId },
      { conflictPaths: ['statusId', 'viewerId'], skipUpdateIfNoValuesChanged: true },
    );

    return successResponse('View recorded', { viewedByMe: true });
  }

  async getViewers(
    statusId: string,
    ownerId: string,
    filter: StatusViewsFilterDto,
  ) {
    const status = await this.statusRepo.findOne({
      where: { id: statusId, ownerId },
    });
    if (!status) throw new NotFoundException('Status not found');

    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 20;
    const skip = (page - 1) * limit;

    const [views, total] = await this.statusViewRepo.findAndCount({
      where: { statusId },
      relations: { viewer: true },
      order: { viewedAt: 'DESC' },
      skip,
      take: limit,
    });

    const data = views.map((v) => ({
      viewerId: v.viewerId,
      username: v.viewer?.username,
      profilePicture: v.viewer?.profilePicture,
      viewedAt: v.viewedAt,
    }));

    return successResponse('Operation successful', {
      currentPage: page,
      data,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  }

  async delete(statusId: string, ownerId: string) {
    try {
      const status = await this.statusRepo.findOne({
        where: { id: statusId, ownerId },
        relations: { media: true },
      });
      if (!status) throw new NotFoundException('Status not found');

      const mediaId = status.media?.id;

      await this.statusViewRepo.delete({ statusId });
      await this.statusRepo.delete({ id: statusId });

      if (mediaId) {
        await this.statusCleanup.deleteOrphanMedias([mediaId]);
      }

      return successResponse('Successfully deleted status');
    } catch (error) {
      throw error;
    }
  }
}
