import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { successResponse } from 'src/common/helpers/response.helper';
import { Post } from './entities/post.entity';
import { PostView } from './entities/post-view.entity';

@Injectable()
export class PostAnalyticsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(PostView)
    private readonly postViewRepo: Repository<PostView>,
  ) {}

  async recordView(postId: string, viewerId?: string) {
    const post = await this.postRepo.findOne({
      where: { id: postId },
      select: ['id', 'ownerId'],
    });
    if (!post) throw new NotFoundException('Post not found');

    await this.postRepo.increment({ id: postId }, 'viewCount', 1);

    if (viewerId && viewerId !== post.ownerId) {
      await this.postViewRepo.upsert(
        { postId, viewerId },
        {
          conflictPaths: ['postId', 'viewerId'],
          skipUpdateIfNoValuesChanged: true,
        },
      );
    }

    return successResponse('View recorded', { viewedByMe: !!viewerId });
  }

  async getAnalytics(postId: string, requesterId: string) {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    if (post.ownerId !== requesterId) {
      throw new ForbiddenException(
        'You are not allowed to view analytics for this post',
      );
    }

    const uniqueViews = await this.postViewRepo.count({ where: { postId } });

    const views = post.viewCount ?? 0;
    const likes = post.likeCount ?? 0;
    const comments = post.commentCount ?? 0;
    const reposts = post.repostCount ?? 0;
    const bookmarks = post.bookmarkCount ?? 0;
    const shares = post.shareCount ?? 0;

    const totalEngagements = likes + comments + reposts + bookmarks + shares;
    const engagementRate = views > 0 ? totalEngagements / views : 0;

    return successResponse('Operation successful', {
      postId: post.id,
      views,
      uniqueViews,
      likes,
      comments,
      reposts,
      bookmarks,
      shares,
      totalEngagements,
      engagementRate: Number(engagementRate.toFixed(4)),
    });
  }
}
