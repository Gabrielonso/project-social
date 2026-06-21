import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { Post } from '../posts/entities/post.entity';
import { PostMedia } from '../posts/entities/post-media.entity';
import { Ad } from '../ads/entities/ads.entity';
import { AdMedia } from '../ads/entities/ads-media.entity';
import { Status } from '../status/entities/status.entity';
import { MessageAttachment } from '../chats/entities/message-attachment.entity';

@Injectable()
export class MediaUsageService {
  constructor(
    @InjectRepository(PostMedia)
    private readonly postMediaRepo: Repository<PostMedia>,
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(AdMedia)
    private readonly adMediaRepo: Repository<AdMedia>,
    @InjectRepository(Ad)
    private readonly adRepo: Repository<Ad>,
    @InjectRepository(Status)
    private readonly statusRepo: Repository<Status>,
    @InjectRepository(MessageAttachment)
    private readonly messageAttachmentRepo: Repository<MessageAttachment>,
  ) {}

  async isMediaInUse(mediaId: string): Promise<boolean> {
    const used = await this.collectUsedMediaIds([mediaId]);
    return used.has(mediaId);
  }

  async filterOrphanMediaIds(mediaIds: string[]): Promise<string[]> {
    const uniqueIds = [...new Set(mediaIds)];
    if (uniqueIds.length === 0) {
      return [];
    }

    const used = await this.collectUsedMediaIds(uniqueIds);
    return uniqueIds.filter((id) => !used.has(id));
  }

  private async collectUsedMediaIds(mediaIds: string[]): Promise<Set<string>> {
    const usedSets = await Promise.all([
      this.findUsedByRelation(this.postMediaRepo, 'pm', 'media', mediaIds),
      this.findUsedByRelation(this.postRepo, 'p', 'sound', mediaIds),
      this.findUsedByRelation(this.adMediaRepo, 'am', 'media', mediaIds),
      this.findUsedByRelation(this.adRepo, 'a', 'sound', mediaIds),
      this.findUsedByRelation(this.statusRepo, 's', 'media', mediaIds),
      this.findUsedByRelation(
        this.messageAttachmentRepo,
        'ma',
        'attachment',
        mediaIds,
      ),
    ]);

    return new Set(usedSets.flat());
  }

  private async findUsedByRelation<T extends ObjectLiteral>(
    repo: Repository<T>,
    alias: string,
    relation: string,
    mediaIds: string[],
  ): Promise<string[]> {
    if (mediaIds.length === 0) {
      return [];
    }

    const rows = await repo
      .createQueryBuilder(alias)
      .innerJoin(`${alias}.${relation}`, 'm')
      .select('m.id', 'id')
      .where('m.id IN (:...mediaIds)', { mediaIds })
      .getRawMany<{ id: string }>();

    return rows.map((row) => row.id);
  }
}
