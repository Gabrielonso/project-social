import {
  Body,
  Controller,
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
import { CreatePostDto } from './dtos/create-post.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PostFilterDto } from './dtos/posts-filter.dto';
import { UpdatePostDto } from './dtos/update-post.dto';

@ApiTags('Posts')
@ApiBearerAuth()
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

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
    summary:
      'Edit a post (allowed: caption, hashtags)',
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
}
