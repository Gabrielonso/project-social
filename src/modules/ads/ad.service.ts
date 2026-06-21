import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateAdDto } from './dtos/create-ad.dto';
import { successResponse } from 'src/common/helpers/response.helper';
import { Media } from 'src/modules/media/entities/media.entity';
import { MediaProvider } from 'src/modules/media/enums/media-provider.enum';
import { MediaStatus } from 'src/modules/media/enums/media-status.enum';
import { MediaType } from 'src/modules/media/enums/media-type.enum';
import { Ad } from './entities/ads.entity';
import { AdMedia } from './entities/ads-media.entity';
import { MediaUploadFolder } from 'src/modules/media/enums/media-upload-folder.enum';
import { User } from '../user/entity/user.entity';
import { normalizeHashtags } from 'src/common/utils/hashtags.util';
import { UpdateAdDto } from './dtos/update-ad.dto';
import { FeedCacheInvalidationService } from '../feeds/feed-cache-invalidation.service';
import { MediaAttachValidator } from '../media/media-attach.validator';
import { ContentPublishStatus } from '../media/enums/content-publish-status.enum';

@Injectable()
export class AdService {
  private readonly logger = new Logger(AdService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly feedCacheInvalidation: FeedCacheInvalidationService,
    private readonly mediaAttachValidator: MediaAttachValidator,
  ) {}

  private async safeInvalidateFeedCaches(
    fn: () => Promise<void>,
  ): Promise<void> {
    try {
      await fn();
    } catch (err) {
      this.logger.warn(
        `Feed cache invalidation failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async createAd(dto: CreateAdDto, userId: string) {
    try {
      const result = await this.dataSource.manager.transaction(
        async (entityManager) => {
          const adRepo = entityManager.getRepository(Ad);
          const mediaRepo = entityManager.getRepository(Media);
          const adMediaRepo = entityManager.getRepository(AdMedia);
          const userRepo = entityManager.getRepository(User);
          const user = await userRepo.findOne({
            where: { id: userId },
            select: ['id'],
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

          let soundMedia: Media | null = null;
          if (dto.sound) {
            const m = dto.sound;
            if (
              !m.sourceIdOrKey.startsWith(`${MediaUploadFolder.ADS}/${userId}/`)
            ) {
              throw new ForbiddenException('Invalid sound ownership or folder');
            }

            if (m.type !== MediaType.AUDIO) {
              throw new HttpException(
                {
                  statusCode: HttpStatus.BAD_REQUEST,
                  message: 'Ad sounds must be of type audio',
                },
                HttpStatus.BAD_REQUEST,
              );
            }

            const sound = mediaRepo.create({
              provider: m.provider,
              type: m.type,
              sourceIdOrKey: m.sourceIdOrKey,
              duration: m.duration,
              status: this.mediaAttachValidator.resolveLegacyStatus(
                m.provider,
                m.type,
              ),
              originalUrl: m.originalUrl,
              streamUrl: m.streamUrl,
              size: m.size,
            });

            soundMedia = await mediaRepo.save(sound);
          }

          let mediaEntities: Media[] = [];
          if (dto.mediaIds?.length) {
            mediaEntities =
              await this.mediaAttachValidator.validateMediaIdsForAttachPending(
                dto.mediaIds,
                userId,
                MediaUploadFolder.ADS,
              );
          }
          //  else if (dto.media?.length) {
          //   const created = dto.media.map((m) => {
          //     if (
          //       !m.sourceIdOrKey.startsWith(`${MediaUploadFolder.ADS}/${userId}/`)
          //     ) {
          //       throw new ForbiddenException('Invalid media ownership or folder');
          //     }

          //     return mediaRepo.create({
          //       provider: m.provider,
          //       type: m.type,
          //       sourceIdOrKey: m.sourceIdOrKey,
          //       width: m.width,
          //       height: m.height,
          //       duration: m.duration,
          //       status: this.mediaAttachValidator.resolveLegacyStatus(
          //         m.provider,
          //         m.type,
          //       ),
          //       originalUrl: m.originalUrl,
          //       streamUrl: m.streamUrl,
          //       size: m.size,
          //     });
          //   });
          //   mediaEntities = await mediaRepo.save(created);
          // }
          else {
            throw new BadRequestException('Provide mediaIds or media');
          }

          const publishStatus =
            this.mediaAttachValidator.resolveInitialPublishStatus(
              mediaEntities,
              soundMedia,
            );

          const ad = adRepo.create({
            ownerId: user.id,
            content: dto.description,
            hashtags: normalizeHashtags(dto.hashtags),
            targetCountry: dto.country,
            targetGender: dto.gender,
            maxAge: dto.maxAge,
            minAge: dto.minAge,
            topic: dto.topic,
            status: 'active',
            sound: soundMedia || undefined,
            publishStatus,
          });
          const savedAd = await adRepo.save(ad);

          const adMedias = mediaEntities.map((media, index) =>
            adMediaRepo.create({
              position: index,
              ad: savedAd,
              media,
            }),
          );

          await adMediaRepo.save(adMedias);

          // enqueue processing ONLY for S3 videos
          mediaEntities
            .filter(
              (m) =>
                m.provider === MediaProvider.S3 && m.type === MediaType.VIDEO,
            )
            .forEach((m) => {
              // this.mediaQueue.add('process', { mediaId: m.id });
            });

          // this.eventBus.publish(
          //   new PostCreatedEvent(post.id, userId),
          // );

          return successResponse('Successfully created ad', {
            adId: savedAd.id,
            publishStatus: savedAd.publishStatus,
          });
        },
      );
      if (
        (result.data as { publishStatus?: ContentPublishStatus })
          ?.publishStatus === ContentPublishStatus.PUBLISHED
      ) {
        await this.safeInvalidateFeedCaches(() =>
          this.feedCacheInvalidation.invalidatePublicFeedListCaches(),
        );
      }
      return result;
    } catch (error) {
      throw error;
    }
  }

  async updateAd(adId: string, dto: UpdateAdDto, userId: string) {
    try {
      const adRepo = this.dataSource.getRepository(Ad);
      const ad = await adRepo.findOne({ where: { id: adId } });

      if (!ad) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'Ad not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      if (ad.ownerId !== userId) {
        throw new ForbiddenException('You are not allowed to edit this ad');
      }

      const updatePayload: Partial<Ad> = {};
      if (dto.topic !== undefined) updatePayload.topic = dto.topic;
      if (dto.description !== undefined)
        updatePayload.content = dto.description;
      if (dto.hashtags !== undefined)
        updatePayload.hashtags = normalizeHashtags(dto.hashtags);

      await adRepo.update({ id: adId }, updatePayload);

      await this.safeInvalidateFeedCaches(() =>
        this.feedCacheInvalidation.invalidateAdAndPublicList(adId),
      );

      return successResponse('Successfully updated ad');
    } catch (error) {
      throw error;
    }
  }
}
