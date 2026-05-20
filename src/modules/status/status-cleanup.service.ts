import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { Status } from './entities/status.entity';
import { StatusView } from './entities/status-view.entity';
import { Media } from '../media/entities/media.entity';

const PURGE_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class StatusCleanupService implements OnModuleInit {
  private readonly logger = new Logger(StatusCleanupService.name);
  private purging = false;

  constructor(
    @InjectRepository(Status) private readonly statusRepo: Repository<Status>,
    @InjectRepository(StatusView)
    private readonly statusViewRepo: Repository<StatusView>,
    @InjectRepository(Media) private readonly mediaRepo: Repository<Media>,
  ) {}

  onModuleInit() {
    void this.purgeExpired();
    setInterval(() => void this.purgeExpired(), PURGE_INTERVAL_MS);
  }

  async purgeExpired(): Promise<number> {
    if (this.purging) return 0;
    this.purging = true;
    try {
      const now = new Date();
      const expired = await this.statusRepo.find({
        where: { expiresAt: LessThan(now) },
        relations: { media: true },
      });

      if (expired.length === 0) return 0;

      const statusIds = expired.map((s) => s.id);
      const mediaIds = expired
        .map((s) => s.media?.id)
        .filter((id): id is string => !!id);

      await this.statusViewRepo.delete({ statusId: In(statusIds) });
      await this.statusRepo.delete({ id: In(statusIds) });

      if (mediaIds.length > 0) {
        await this.deleteOrphanMedias(mediaIds);
      }

      this.logger.log(`Purged ${expired.length} expired status(es)`);
      return expired.length;
    } catch (err) {
      this.logger.error('Failed to purge expired statuses', err);
      return 0;
    } finally {
      this.purging = false;
    }
  }

  async deleteOrphanMedias(mediaIds: string[]): Promise<void> {
    const uniqueIds = [...new Set(mediaIds)];
    if (uniqueIds.length === 0) return;

    const stillUsed = await this.mediaRepo
      .createQueryBuilder('m')
      .select('m.id', 'id')
      .where('m.id IN (:...uniqueIds)', { uniqueIds })
      .andWhere(
        `(
          EXISTS (SELECT 1 FROM statuses s WHERE s."mediaId" = m.id)
          OR EXISTS (SELECT 1 FROM post_medias pm WHERE pm."mediaId" = m.id)
          OR EXISTS (SELECT 1 FROM posts p WHERE p.sound_media_id = m.id)
          OR EXISTS (SELECT 1 FROM ad_medias am WHERE am."mediaId" = m.id)
          OR EXISTS (SELECT 1 FROM ads a WHERE a.sound_media_id = m.id)
          OR EXISTS (SELECT 1 FROM message_attachments ma WHERE ma."attachmentId" = m.id)
          OR EXISTS (SELECT 1 FROM stories st WHERE st."mediaId" = m.id)
        )`,
      )
      .getRawMany<{ id: string }>();

    const usedSet = new Set(stillUsed.map((r) => r.id));
    const orphanIds = uniqueIds.filter((id) => !usedSet.has(id));
    if (orphanIds.length > 0) {
      await this.mediaRepo.delete({ id: In(orphanIds) });
    }
  }
}
