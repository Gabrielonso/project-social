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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { StatusService } from './status.service';
import { CreateStatusDto } from './dtos/create-status.dto';
import { StatusFilterDto } from './dtos/status-filter.dto';
import { StatusViewsFilterDto } from './dtos/status-views-filter.dto';

@ApiTags('Status')
@ApiBearerAuth()
@Controller('status')
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @UseGuards(JwtAuthGuard)
  @Post('')
  @ApiOperation({ summary: 'Create a status (expires in 24h)' })
  @ApiBody({ type: CreateStatusDto })
  create(@Body() dto: CreateStatusDto, @Req() req) {
    const userId: string = req.user.id;
    return this.statusService.createStatus(dto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({
    summary:
      'Get my active statuses (includes viewCount and viewedByMe per item)',
  })
  getMyActive(@Query() filter: StatusFilterDto, @Req() req) {
    const userId: string = req.user.id;
    return this.statusService.getMyActive(userId, filter);
  }

  @UseGuards(JwtAuthGuard)
  @Get('feed')
  @ApiOperation({
    summary:
      'Stories feed for people you follow only (excludes you; use GET /status/me for yours). Tray: unseen first, then seen, each by newest activity. Statuses per user: oldest first for playback.',
  })
  getFeed(@Query() filter: StatusFilterDto, @Req() req) {
    const userId: string = req.user.id;
    return this.statusService.getFeed(userId, filter);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/:userId')
  @ApiOperation({
    summary:
      "Get a user's active statuses (includes viewedByMe for the authenticated viewer)",
  })
  getByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() filter: StatusFilterDto,
    @Req() req,
  ) {
    const viewerId: string = req.user.id;
    return this.statusService.getActiveByOwner(userId, filter, viewerId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':statusId/view')
  @ApiOperation({ summary: 'Mark a status as viewed (idempotent)' })
  markView(
    @Param('statusId', ParseUUIDPipe) statusId: string,
    @Req() req,
  ) {
    const userId: string = req.user.id;
    return this.statusService.markView(statusId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':statusId/views')
  @ApiOperation({ summary: 'List viewers of my status (owner only)' })
  getViewers(
    @Param('statusId', ParseUUIDPipe) statusId: string,
    @Query() filter: StatusViewsFilterDto,
    @Req() req,
  ) {
    const userId: string = req.user.id;
    return this.statusService.getViewers(statusId, userId, filter);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':statusId')
  @ApiOperation({ summary: 'Delete my status' })
  delete(@Param('statusId', ParseUUIDPipe) statusId: string, @Req() req) {
    const userId: string = req.user.id;
    return this.statusService.delete(statusId, userId);
  }
}
