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
    return this.statusService.create(dto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get my active statuses' })
  getMyActive(@Query() filter: StatusFilterDto, @Req() req) {
    const userId: string = req.user.id;
    return this.statusService.getMyActive(userId, filter);
  }

  @UseGuards(JwtAuthGuard)
  @Get('feed')
  @ApiOperation({ summary: 'Get active statuses from me + following' })
  getFeed(@Query() filter: StatusFilterDto, @Req() req) {
    const userId: string = req.user.id;
    return this.statusService.getFeed(userId, filter);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/:userId')
  @ApiOperation({ summary: "Get a user's active statuses" })
  getByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() filter: StatusFilterDto,
  ) {
    return this.statusService.getActiveByOwner(userId, filter);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':statusId')
  @ApiOperation({ summary: 'Delete my status' })
  delete(
    @Param('statusId', ParseUUIDPipe) statusId: string,
    @Req() req,
  ) {
    const userId: string = req.user.id;
    return this.statusService.delete(statusId, userId);
  }
}

