import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { In, Repository } from 'typeorm';
import { SendNotificationDto } from './dto/send-notifications.dto';
import { NotificationCategoryEnum } from './interfaces/notification.interface';
import { Notification } from './entity/notification.entity';
import { User } from '../user/entity/user.entity';
import { UserRoles } from 'src/common/enums/user-roles.constants';
import { JobQueue, JobType } from 'src/common/enums/jobs.enum';
import { Queue } from 'bullmq';
import { successResponse } from 'src/common/helpers/response.helper';
import { NotificationQueryFilterDto } from './dto/notification-filter.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectQueue(JobQueue.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
  ) {}

  async getMyNotifications(
    userId: string,
    queryFilterDto: NotificationQueryFilterDto,
  ) {
    const { page, limit, read } = queryFilterDto;
    const safePage = Number(page) || 1;
    const safeLimit = Number(limit) || 20;
    const skip = (safePage - 1) * safeLimit;

    const [notifications, total] = await this.notificationRepo.findAndCount({
      where: { userId, ...(read != null && read != undefined && { read }) },
      take: safeLimit,
      skip,
      order: { createdAt: 'DESC' },
    });

    return successResponse('Operation Successful', {
      data: notifications,
      currentPage: safePage,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    });
  }

  async readNotifications(userId: string, notifications: string[]) {
    await this.notificationRepo.update(
      { userId, id: In(notifications) },
      { read: true },
    );

    return successResponse('Operation Successful');
  }

  async readAllNotifications(userId: string) {
    await this.notificationRepo.update({ userId }, { read: true });

    return successResponse('Successfully read all notifications');
  }

  async notifyUser(params: { userId: string; title: string; body: string }) {
    const notification = this.notificationRepo.create({
      userId: params.userId,
      title: params.title,
      body: params.body,
    });
    await this.notificationRepo.save(notification);

    await this.notificationsQueue.add(
      JobType.SEND_PUSH_NOTIFICATION,
      { userId: params.userId, title: params.title, body: params.body },
      {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 5,
        backoff: { type: 'exponential', delay: 3000 },
      },
    );

    return successResponse('Operation Successful');
  }

  async sendNotificationToUsers(dto: SendNotificationDto) {
    try {
      let recipients: User[] = [];

      switch (dto.category) {
        case NotificationCategoryEnum.ALL_USERS:
          recipients = await this.userRepo.find({
            where: {
              verified: true,
              role: UserRoles.USER,
            },
            select: ['id', 'email'],
          });
          break;

        case NotificationCategoryEnum.SELECTED:
          recipients = await this.userRepo.find({
            where: [
              {
                id: In(dto.users),
                verified: true,
                role: UserRoles.USER,
              },
              {
                email: In(dto.users),
                verified: true,
                role: UserRoles.USER,
              },
            ],
            select: ['id', 'email'],
          });

          break;

        case NotificationCategoryEnum.FILTERED:
          recipients = await this.userRepo.find({
            where: {
              // ...(dto.filters.status && { status: dto.filters.status }),
              verified: true,
              role: UserRoles.USER,
            },
            select: ['id', 'email'],
          });
          break;

        default:
          throw new BadRequestException('Invalid category');
      }

      if (recipients.length === 0) {
        throw new NotFoundException('No users found for this notification');
      }

      const title = dto.title || 'Notification';
      const chunks = this.chunkArray(recipients, 1000);
      for (const chunk of chunks) {
        await Promise.all(
          chunk.map((u) =>
            this.notifyUser({
              userId: u.id,
              title,
              body: dto.body,
            }),
          ),
        );
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Successfully queued notifications',
        data: { totalRecipients: recipients.length },
      };
    } catch (error) {
      throw error;
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // private queueNotification(users: User[], title: string, body: string) {
  //   users.forEach(async (user) => {
  //     await this.notificationsQueue.add(
  //       JobType.SEND_PUSH_NOTIFICATION,
  //       { userId: user?.id, body, title },
  //       {
  //         removeOnComplete: true,
  //         removeOnFail: false,
  //         attempts: 3,
  //         backoff: {
  //           type: 'exponential',
  //           delay: 3000,
  //         },
  //       },
  //     );
  //   });
  // }
}
