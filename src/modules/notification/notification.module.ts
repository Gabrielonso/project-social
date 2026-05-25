import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entity/user.entity';
import { Notification } from './entity/notification.entity';
import { BullModule } from '@nestjs/bullmq';
import { JobQueue } from 'src/common/enums/jobs.enum';
import { OneSignalService } from './onesignal.service';
import { NotificationProcessor } from './notification.processor';
import { NotificationDispatcher } from './notification.dispatcher';
import { RedisModule } from 'src/common/redis/redis.module';

@Module({
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationDispatcher,
    OneSignalService,
    NotificationProcessor,
  ],
  imports: [
    TypeOrmModule.forFeature([Notification, User]),
    BullModule.registerQueue({ name: JobQueue.NOTIFICATIONS }),
    RedisModule,
  ],
  exports: [NotificationService, NotificationDispatcher, OneSignalService],
})
export class NotificationModule {}
