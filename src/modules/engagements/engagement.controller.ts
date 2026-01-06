import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LikesService } from './services/likes.services';
import { ToggleLikeDto } from './dtos/toggle-like.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { CommentsService } from './services/comments.services';
import { CommentsQueryDto } from './dtos/comments-query.dto';
import { ReplyCommentDto } from './dtos/reply-comment.dto';

@ApiTags('Engagements')
@ApiBearerAuth()
@Controller('engagements')
@UseGuards(JwtAuthGuard)
export class EngagementsController {
  constructor(
    private readonly likesService: LikesService,
    private readonly commentsService: CommentsService,
  ) {}

  @Post('likes')
  @ApiOperation({ summary: 'Toggle like for a post, ad, etc' })
  @ApiBody({ type: ToggleLikeDto })
  async toggleLike(@Req() req, @Body() dto: ToggleLikeDto) {
    const userId: string = req.user.id;
    return this.likesService.toggleLike(dto.entity, dto.entityId, userId);
  }

  @Post('comments')
  @ApiOperation({ summary: 'Comment on a post,ad, etc' })
  @ApiBody({ type: CreateCommentDto })
  async createComment(@Req() req, @Body() dto: CreateCommentDto) {
    const userId: string = req.user.id;
    return this.commentsService.createComment(dto, userId);
  }

  @Get('comments')
  @ApiOperation({ summary: 'Get Comments' })
  getComments(@Query() commentsQueryDto: CommentsQueryDto) {
    return this.commentsService.getComments(
      commentsQueryDto.entity,
      commentsQueryDto.entityId,
    );
  }

  @Post('comments/:commentId/replies')
  @ApiOperation({ summary: 'Reply to a comment' })
  @ApiParam({
    description: 'Comment ID being replied to',
    example: 'fd9391ab-9f91-45ef-87a6-df076bb19d0c',
    name: 'commentId',
  })
  @ApiBody({ type: ReplyCommentDto })
  replyToComment(
    @Req() req,
    @Body() dto: ReplyCommentDto,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ) {
    const userId: string = req.user.id;
    return this.commentsService.replyToComment(commentId, dto.content, userId);
  }

  @Get('comments/:commentId/replies')
  @ApiOperation({ summary: 'Get replies to a comment' })
  @ApiParam({
    description: 'Comment ID',
    example: 'fd9391ab-9f91-45ef-87a6-df076bb19d0c',
    name: 'commentId',
  })
  getRepliesToComments(@Param('commentId', ParseUUIDPipe) commentId: string) {
    return this.commentsService.getRepliesToComment(commentId);
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Delete your comment/reply' })
  @ApiParam({
    description: 'Comment(reply) ID',
    example: 'fd9391ab-9f91-45ef-87a6-df076bb19d0c',
    name: 'commentId',
  })
  deleteComment(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Req() req,
  ) {
    const userId: string = req.user.id;
    return this.commentsService.deleteComment(commentId, userId);
  }
}
