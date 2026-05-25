import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CallHistoryFilterDto } from '../dto/call-history-filter.dto';
import { CallHistoryService } from '../services/call-history.service';

@ApiTags('Calls')
@ApiBearerAuth()
@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(private readonly callHistoryService: CallHistoryService) {}

  @Get('history')
  @ApiOperation({
    summary: 'Get call history',
    description:
      'Paginated call log for the authenticated user. Supports search, filters, and date range.',
  })
  getCallHistory(@Req() req, @Query() filter: CallHistoryFilterDto) {
    return this.callHistoryService.getHistory(req.user.id, filter);
  }
}
