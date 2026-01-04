import { Body, Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { FeedService } from './feed.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { FeedFilterDto } from './dtos/feed-filter.dto';

@ApiTags('Feeds')
@Controller('feeds')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @UseGuards(JwtAuthGuard)
  @Get('')
  @ApiOperation({ summary: 'Get Feed' })
  @ApiBearerAuth()
  async getFeed(@Query() feedFilterDto: FeedFilterDto, @Req() req) {
    const userId: string = req.user.id;
    return this.feedService.getFeed(userId, feedFilterDto);
  }
}
