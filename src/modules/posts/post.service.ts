import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CreatePostDto } from './dtos/create-post.dto';
import { successResponse } from 'src/common/helpers/response.helper';
import { Post } from './entities/post.entity';
import { Media } from 'src/modules/media/entities/media.entity';
import { MediaProvider } from 'src/modules/media/enums/media-provider.enum';
import { PostMedia } from './entities/post-media.entity';
import { MediaStatus } from 'src/modules/media/enums/media-status.enum';
import { MediaType } from 'src/modules/media/enums/media-type.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { PostFilterDto } from './dtos/posts-filter.dto';
import { MediaUploadFolder } from 'src/modules/media/enums/media-upload-folder.enum';
import { User } from '../user/entity/user.entity';
import { RawFeedRow } from '../feeds/types/feed.types';
import { FeedType } from '../feeds/enums/feed-type.enum';
import { Ad } from '../ads/entities/ads.entity';
import { normalizeHashtags } from 'src/common/utils/hashtags.util';
import { UpdatePostDto } from './dtos/update-post.dto';
import { TagType } from '../engagements/enums/tag-type.enum';
import { Tag } from '../engagements/entities/tag.entity';

@Injectable()
export class PostService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Post)
    private postRepo: Repository<Post>,
    @InjectRepository(Ad)
    private adRepo: Repository<Ad>,
  ) {}

  async createPost(dto: CreatePostDto, userId: string) {
    try {
      return await this.dataSource.manager.transaction(
        async (entityManager) => {
          const postRepo = entityManager.getRepository(Post);
          const mediaRepo = entityManager.getRepository(Media);
          const postMediaRepo = entityManager.getRepository(PostMedia);
          const userRepo = entityManager.getRepository(User);
          const tagRepo = entityManager.getRepository(Tag);
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
          let soundMedia: Media | null = null;
          if (dto.sound) {
            const m = dto.sound;
            if (
              !m.sourceIdOrKey.startsWith(
                `${MediaUploadFolder.POSTS}/${userId}/`,
              )
            ) {
              throw new ForbiddenException('Invalid sound ownership or folder');
            }

            if (m.type !== MediaType.AUDIO) {
              throw new HttpException(
                {
                  statusCode: HttpStatus.BAD_REQUEST,
                  message: 'Post sounds must be of type audio',
                },
                HttpStatus.BAD_REQUEST,
              );
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

            soundMedia = await mediaRepo.save(sound);
          }

          const post = postRepo.create({
            content: dto.caption,
            hashtags: normalizeHashtags(dto.hashtags),
            ownerId: user.id,
            ownerUsername: user.username,
            ownerAvatar: user.profilePicture,
            sound: soundMedia || undefined,
            allowComments: dto.allowComments,
            isPublic: dto.isPublic,
            location: dto.location,
          });
          const savedPost = await postRepo.save(post);

          const mediaEntities = dto.media.map((m) => {
            // 🔐 ownership validation
            if (
              !m.sourceIdOrKey.startsWith(
                `${MediaUploadFolder.POSTS}/${userId}/`,
              )
            ) {
              throw new ForbiddenException('Invalid media ownership or folder');
            }

            const isCloudinary = m.provider === MediaProvider.CLOUDINARY;

            return mediaRepo.create({
              //post: post.id,
              provider: m.provider,
              type: m.type,
              sourceIdOrKey: m.sourceIdOrKey,
              width: m.width,
              height: m.height,
              duration: m.duration,
              status: isCloudinary ? MediaStatus.READY : MediaStatus.PROCESSING,
              originalUrl: m.originalUrl,
              streamUrl: m.streamUrl,
              size: m.size,

              //  position: index,
            });
          });

          const postMedias = mediaEntities.map((media, index) =>
            postMediaRepo.create({
              position: index,
              post: savedPost,
              media,
            }),
          );

          await postMediaRepo.save(postMedias);

          if (dto.tags?.length) {
            for (const tag of dto.tags || []) {
              if (tag.type === TagType.MENTION) {
                if (tag.startIndex == null || tag.endIndex == null) {
                  throw new BadRequestException(
                    'Mentions must include startIndex and endIndex',
                  );
                }
              }
            }

            const tagEntities = dto?.tags?.map((tag) => {
              return tagRepo.create({
                entity: FeedType.POST,
                entityId: savedPost.id,
                userId: tag.userId,
                username: tag.username,
                userAvatar: tag.userAvatar,
                ...(tag.startIndex &&
                  tag.startIndex != undefined && {
                    startIndex: tag.startIndex,
                  }),
                ...(tag.endIndex &&
                  tag.endIndex != undefined && {
                    endIndex: tag.endIndex,
                  }),
                type: tag.type,
              });
            });

            await tagRepo.save(tagEntities);
          }

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

          return successResponse('Successfully created post');
        },
      );
    } catch (error) {
      throw error;
    }
  }

  async updatePost(postId: string, dto: UpdatePostDto, userId: string) {
    try {
      const post = await this.postRepo.findOne({ where: { id: postId } });
      if (!post) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'Post not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      if (post.ownerId !== userId) {
        throw new ForbiddenException('You are not allowed to edit this post');
      }

      const updatePayload: Partial<Post> = {};
      if (dto.caption !== undefined) updatePayload.content = dto.caption;
      if (dto.hashtags !== undefined)
        updatePayload.hashtags = normalizeHashtags(dto.hashtags);
      if (dto.allowComments !== undefined)
        updatePayload.allowComments = dto.allowComments;
      if (dto.isPublic !== undefined) updatePayload.isPublic = dto.isPublic;
      if (dto.location !== undefined) updatePayload.location = dto.location;

      await this.postRepo.update({ id: postId }, updatePayload);

      return successResponse('Successfully updated post');
    } catch (error) {
      throw error;
    }
  }

  // async getMyPostFeeds(postFilterDto: PostFilterDto, userId: string) {
  //   try {
  //     const page = Number(postFilterDto.page) || 1;
  //     const limit = Number(postFilterDto.limit) || 20;
  //     const offset = (page - 1) * limit;

  //     const rows = await this.dataSource.query(
  //       `
  //       (
  //         SELECT
  //           p.id,
  //           'post' AS type,
  //           p.created_at AS "createdAt"
  //         FROM posts p WHERE p.owner_id = $3
  //       )
  //       UNION ALL
  //       (
  //         SELECT
  //           a.id,
  //           'ad' AS type,
  //           a.created_at AS "createdAt"
  //         FROM ads a WHERE a.owner_id = $3
  //       )
  //       ORDER BY "createdAt" DESC
  //       LIMIT $1 OFFSET $2
  //       `,
  //       [limit, offset, userId],
  //     );

  //     return this.hydrateMyFeed(userId, rows, page, limit);
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  // private async hydrateMyFeed(
  //   viewerId: string,
  //   rows: RawFeedRow[],
  //   page: number,
  //   limit: number,
  // ) {
  //   const postIds = rows
  //     .filter((r) => r.type === FeedType.POST)
  //     .map((r) => r.id);

  //   const adIds = rows.filter((r) => r.type === FeedType.AD).map((r) => r.id);

  //   // Fetch posts exactly how you already do
  //   const posts = postIds.length
  //     ? await this.postRepo
  //         .createQueryBuilder('post')
  //         .leftJoinAndSelect('post.medias', 'medias')
  //         .select(['post', 'medias'])
  //         .leftJoinAndSelect('medias.media', 'media')
  //         .where('post.id IN (:...ids)', { ids: postIds })
  //         .getMany()
  //     : [];

  //   // Fetch ads (simple)
  //   const ads = adIds.length
  //     ? await this.adRepo
  //         .createQueryBuilder('ad')
  //         .leftJoinAndSelect('ad.medias', 'medias')
  //         .select(['ad', 'medias'])
  //         .leftJoinAndSelect('medias.media', 'media')
  //         .where('ad.id IN (:...ids)', { ids: adIds })
  //         .getMany()
  //     : [];

  //   const likes = viewerId
  //     ? await this.dataSource.query(
  //         `
  //       SELECT entity, entity_id
  //       FROM likes
  //       WHERE user_id = $1
  //         AND (
  //           (entity = 'post' AND entity_id = ANY($2))
  //           OR
  //           (entity = 'ad' AND entity_id = ANY($3))
  //         )
  //       `,
  //         [viewerId, postIds, adIds],
  //       )
  //     : [];

  //   const bookmarks = viewerId
  //     ? await this.dataSource.query(
  //         `
  //       SELECT entity, entity_id
  //       FROM bookmarks
  //       WHERE user_id = $1
  //         AND (
  //           (entity = 'post' AND entity_id = ANY($2))
  //           OR
  //           (entity = 'ad' AND entity_id = ANY($3))
  //         )
  //       `,
  //         [viewerId, postIds, adIds],
  //       )
  //     : [];

  //   const likedSet = new Set(likes?.map((l) => `${l?.entity}:${l?.entity_id}`));

  //   const bookmarkedSet = new Set(
  //     bookmarks?.map((l) => `${l?.entity}:${l?.entity_id}`),
  //   );

  //   // Map for fast lookup
  //   const postMap = new Map(
  //     posts.map((p) => [
  //       p.id,
  //       {
  //         ...p,
  //         viewerHasLiked: likedSet.has(`${FeedType.POST}:${p.id}`),
  //         viewerHasBookmarked: bookmarkedSet.has(`${FeedType.POST}:${p.id}`),
  //       },
  //     ]),
  //   );
  //   const adMap = new Map(
  //     ads.map((a) => [
  //       a.id,
  //       {
  //         ...a,
  //         viewerHasLiked: likedSet.has(`${FeedType.AD}:${a.id}`),
  //         viewerHasBookmarked: bookmarkedSet.has(`${FeedType.AD}:${a.id}`),
  //       },
  //     ]),
  //   );

  //   // Rebuild ordered feed
  //   const feed = rows.map((row) => {
  //     if (row.type === FeedType.POST) {
  //       return {
  //         type: 'post',
  //         data: postMap.get(row.id),
  //       };
  //     }

  //     return {
  //       type: 'ad',
  //       data: adMap.get(row.id),
  //     };
  //   });

  //   return successResponse('Operation Successful', {
  //     data: feed,
  //     currentPage: page,
  //     totalPages: Math.ceil(feed.length / limit),
  //   });
  // }
}
