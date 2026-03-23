import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { FeedService } from './feed.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { FeedFilterDto } from './dtos/feed-filter.dto';
import { JwtOptionalGuard } from 'src/common/guards/jwt-optional.guard';

@ApiTags('Feeds')
@Controller('feeds')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @UseGuards(JwtOptionalGuard)
  @Get('')
  @ApiOperation({ summary: 'Get Feed' })
  async getFeed(@Query() feedFilterDto: FeedFilterDto, @Req() req) {
    const userId: string = req?.user?.id;
    return this.feedService.getFeed(userId, feedFilterDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('my')
  @ApiOperation({
    summary: 'Get posts and ads created by the authenticated user',
  })
  async getMyPublishedFeed(@Query() feedFilterDto: FeedFilterDto, @Req() req) {
    const userId: string = req.user.id;
    return this.feedService.getMyPublishedFeed(userId, feedFilterDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('presence')
  @ApiOperation({
    summary: 'Get posts and ads liked or bookmarked by the authenticated user',
  })
  async getPresence(@Query() feedFilterDto: FeedFilterDto, @Req() req) {
    const userId: string = req.user.id;
    return this.feedService.getPresence(userId, feedFilterDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('tagged')
  @ApiOperation({
    summary: `Get posts and ads where user was tagged and mentioned`,
  })
  async getTaggedFeed(@Query() feedFilterDto: FeedFilterDto, @Req() req) {
    const userId: string = req.user.id;
    return this.feedService.getMyTaggedFeed(userId, feedFilterDto);
  }
}
