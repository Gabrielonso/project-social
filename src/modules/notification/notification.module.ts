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

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, OneSignalService, NotificationProcessor],
  imports: [
    TypeOrmModule.forFeature([Notification, User]),
    BullModule.registerQueue({ name: JobQueue.NOTIFICATIONS }),
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
