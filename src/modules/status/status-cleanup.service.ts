import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { Status } from './entities/status.entity';
import { StatusView } from './entities/status-view.entity';
import { MediaDeletionService } from '../media/media-deletion.service';

const PURGE_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class StatusCleanupService implements OnModuleInit {
  private readonly logger = new Logger(StatusCleanupService.name);
  private purging = false;

  constructor(
    @InjectRepository(Status) private readonly statusRepo: Repository<Status>,
    @InjectRepository(StatusView)
    private readonly statusViewRepo: Repository<StatusView>,
    private readonly mediaDeletionService: MediaDeletionService,
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
    await this.mediaDeletionService.deleteOrphanMedias(mediaIds);
  }
}
