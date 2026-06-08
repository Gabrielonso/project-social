import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PostService } from './post.service';
import { PostAnalyticsService } from './post-analytics.service';
import { CreatePostDto } from './dtos/create-post.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { JwtOptionalGuard } from 'src/common/guards/jwt-optional.guard';
import { PostFilterDto } from './dtos/posts-filter.dto';
import { UpdatePostDto } from './dtos/update-post.dto';

@ApiTags('Posts')
@ApiBearerAuth()
@Controller('posts')
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly postAnalyticsService: PostAnalyticsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('')
  @ApiOperation({ summary: 'Create a post' })
  @ApiBody({ type: CreatePostDto })
  async createPost(@Body() dto: CreatePostDto, @Req() req) {
    const userId: string = req.user.id;
    return this.postService.createPost(dto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':postId')
  @ApiOperation({
    summary: 'Edit a post (allowed: caption, hashtags, tags)',
  })
  @ApiBody({ type: UpdatePostDto })
  async updatePost(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: UpdatePostDto,
    @Req() req,
  ) {
    const userId: string = req.user.id;
    return this.postService.updatePost(postId, dto, userId);
  }

  // @UseGuards(JwtAuthGuard)
  // @Get('')
  // @ApiOperation({ summary: 'Get Posts' })
  // @ApiBearerAuth()
  // async getPosts(@Query() postFilterDto: PostFilterDto, @Req() req) {
  //   const userId: string = req.user.id;
  //   return this.postService.getMyPostFeeds(postFilterDto, userId);
  // }

  @UseGuards(JwtAuthGuard)
  @Delete(':postId')
  @ApiOperation({ summary: 'Delete a post' })
  deleteUser(@Param('postId', new ParseUUIDPipe()) postId: string, @Req() req) {
    const userId: string = req.user.id;
    return this.postService.deletePost(postId, userId);
  }

  @UseGuards(JwtOptionalGuard)
  @Post(':postId/view')
  @ApiOperation({ summary: 'Record a view (impression) for a post' })
  @ApiParam({
    description: 'Post ID',
    example: 'fd9391ab-9f91-45ef-87a6-df076bb19d0c',
    name: 'postId',
  })
  async recordView(
    @Param('postId', new ParseUUIDPipe()) postId: string,
    @Req() req,
  ) {
    const viewerId: string | undefined = req?.user?.id;
    return this.postAnalyticsService.recordView(postId, viewerId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':postId/analytics')
  @ApiOperation({
    summary: 'Get analytics for your post (owner only)',
  })
  @ApiParam({
    description: 'Post ID',
    example: 'fd9391ab-9f91-45ef-87a6-df076bb19d0c',
    name: 'postId',
  })
  async getAnalytics(
    @Param('postId', new ParseUUIDPipe()) postId: string,
    @Req() req,
  ) {
    const userId: string = req.user.id;
    return this.postAnalyticsService.getAnalytics(postId, userId);
  }
}
