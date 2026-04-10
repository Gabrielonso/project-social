import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationsIdsDto } from './dto/notifications.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiBody, ApiOperation } from '@nestjs/swagger';
import { NotificationQueryFilterDto } from './dto/notification-filter.dto';

@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications' })
  getMyNotification(
    @Req() req,
    @Query() queryFilterDto: NotificationQueryFilterDto,
  ) {
    const userId = req?.user?.id;

    return this.notificationService.getMyNotifications(userId, queryFilterDto);
  }

  @Patch()
  @ApiOperation({ summary: 'Mark notification(s) as read' })
  @ApiBody({ type: NotificationsIdsDto })
  markReadNotifications(
    @Req() req,
    @Body() notificationsIdsDto: NotificationsIdsDto,
  ) {
    const userId = req?.user?.id;
    const { notifications } = notificationsIdsDto;
    return this.notificationService.readNotifications(userId, notifications);
  }

  @Post('/readAll')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  readAllNotifications(@Req() req) {
    const userId = req?.user?.id;
    return this.notificationService.readAllNotifications(userId);
  }

  @Post('/test/push')
  @ApiOperation({ summary: 'Test push notification' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        body: { type: 'string' },
      },
    },
  })
  sendTestPush(@Req() req, @Body() body: { title: string; body: string }) {
    const userId = req?.user?.id;
    return this.notificationService.notifyUser({
      userId,
      title: body.title,
      body: body.body,
    });
  }
}
