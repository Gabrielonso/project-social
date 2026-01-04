import {
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

@Injectable()
export class PostService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Post)
    private postRepo: Repository<Post>,
  ) {}

  async createPost(dto: CreatePostDto, userId: string) {
    try {
      return await this.dataSource.manager.transaction(
        async (entityManager) => {
          const postRepo = entityManager.getRepository(Post);
          const mediaRepo = entityManager.getRepository(Media);
          const postMediaRepo = entityManager.getRepository(PostMedia);
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
          const post = postRepo.create({
            content: dto.caption,
            ownerId: user.id,
            ownerUsername: user.username,
            ownerAvatar: user.profilePicture,
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

          const postMedias = mediaEntities.map((media, index) => {
            return postMediaRepo.create({
              position: index,
              post: savedPost,
              media,
            });
          });

          await postMediaRepo.save(postMedias);

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

  async getPosts(postFilterDto: PostFilterDto) {
    try {
      // const [posts, total]: [Post[], number] = await this.postRepo.findAndCount(
      //   {
      //     relations: [
      //       'user',
      //       'medias',
      //       // "attendees",
      //       // "attendees.user",
      //       // "likes",
      //       // "tags",
      //       // "tags.user",
      //     ],
      //     select: {
      //       user: {
      //         id: true,
      //         username: true,
      //         profilePicture: true,
      //       },
      //       // attendees: {
      //       //   ['id']: true,
      //       //   ['user']: { id: true },
      //       //   ['status']: true,
      //       // },
      //       // likes: { id: true },
      //       // tags: {
      //       //   ['id']: true,
      //       //   ['name']: true,
      //       //   ['user']: {
      //       //     id: true,
      //       //     username: true,
      //       //     avatar: true,
      //       //     first_name: true,
      //       //     last_name: true,
      //       //   },
      //       // },
      //     },
      //     // where: {
      //     //   user: {
      //     //     ...(blockedUsers && { id: Not(Any(blockedUsers)) }),
      //     //     incognito: false,
      //     //   },
      //     //   ...(hiddenPost.length > 0 && { id: Not(Any(hiddenPost)) }),
      //     // },
      //     take: limit,
      //     skip: (batch - 1) * limit,
      //     order: { createdAt: 'DESC' },
      //   },
      // );

      // const data = await updateLikes(posts, "post", req.userId);

      const page = Number(postFilterDto.page) || 1;
      const limit = postFilterDto.limit ? Number(postFilterDto.limit) : null;
      const skip = limit ? (page - 1) * limit : 0;

      const qb = this.postRepo
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.user', 'user')
        .leftJoinAndSelect('post.medias', 'medias')
        .select([
          'post',
          'user.id',
          'user.username',
          'user.profilePicture',
          'medias',
        ])
        .leftJoinAndSelect('medias.media', 'media');

      qb.orderBy('post.createdAt', 'DESC');

      if (limit) {
        qb.skip(skip).take(limit);
      }

      const [data, total] = await qb.getManyAndCount();

      return successResponse('Operation Successful', {
        data,
        total,
        currentPage: page,
        totalPages: limit ? Math.ceil(total / limit) : 1,
      });
    } catch (error) {
      throw error;
    }
  }
}
