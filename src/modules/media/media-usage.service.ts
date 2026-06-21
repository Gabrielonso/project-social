import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Media } from './entities/media.entity';

const MEDIA_IN_USE_SQL = `(
  EXISTS (SELECT 1 FROM statuses s WHERE s."mediaId" = m.id)
  OR EXISTS (SELECT 1 FROM post_medias pm WHERE pm."mediaId" = m.id)
  OR EXISTS (SELECT 1 FROM posts p WHERE p.sound_media_id = m.id)
  OR EXISTS (SELECT 1 FROM ad_medias am WHERE am."mediaId" = m.id)
  OR EXISTS (SELECT 1 FROM ads a WHERE a.sound_media_id = m.id)
  OR EXISTS (SELECT 1 FROM message_attachments ma WHERE ma."attachmentId" = m.id)
  OR EXISTS (SELECT 1 FROM stories st WHERE st."mediaId" = m.id)
)`;

@Injectable()
export class MediaUsageService {
  constructor(
    @InjectRepository(Media)
    private readonly mediaRepo: Repository<Media>,
  ) {}

  async isMediaInUse(mediaId: string): Promise<boolean> {
    const rows = await this.mediaRepo
      .createQueryBuilder('m')
      .select('m.id', 'id')
      .where('m.id = :mediaId', { mediaId })
      .andWhere(MEDIA_IN_USE_SQL)
      .getRawMany<{ id: string }>();

    return rows.length > 0;
  }

  async filterOrphanMediaIds(mediaIds: string[]): Promise<string[]> {
    const uniqueIds = [...new Set(mediaIds)];
    if (uniqueIds.length === 0) {
      return [];
    }

    const stillUsed = await this.mediaRepo
      .createQueryBuilder('m')
      .select('m.id', 'id')
      .where('m.id IN (:...uniqueIds)', { uniqueIds })
      .andWhere(MEDIA_IN_USE_SQL)
      .getRawMany<{ id: string }>();

    const usedSet = new Set(stillUsed.map((r) => r.id));
    return uniqueIds.filter((id) => !usedSet.has(id));
  }
}
