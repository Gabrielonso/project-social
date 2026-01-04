import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dtos/create-post.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

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

  // @UseGuards(JwtAuthGuard)
  // @Get('')
  // @ApiOperation({ summary: 'Get Posts' })
  // @ApiBearerAuth()
  // async getPosts(@Query() postFilterDto: PostFilterDto) {
  //   return this.postService.getPosts(postFilterDto);
  // }
}
