import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  JobQueue,
  JobType,
  SendPushBatchJob,
  SendPushJob,
} from 'src/common/enums/jobs.enum';
import { OneSignalService } from './onesignal.service';

@Processor(JobQueue.NOTIFICATIONS)
export class NotificationProcessor extends WorkerHost {
  constructor(private readonly oneSignalService: OneSignalService) {
    super();
  }

  async process(job: Job<SendPushJob>) {
    if (job.name === JobType.SEND_PUSH_NOTIFICATION) {
      const { userId, title, body } = job.data as SendPushJob;
      await this.oneSignalService.sendPush({ userId, title, body });
      return;
    }

    if (job.name === JobType.SEND_PUSH_NOTIFICATION_BATCH) {
      const { userIds, title, body } = job.data as unknown as SendPushBatchJob;
      await this.oneSignalService.sendPushBatch({ userIds, title, body });
      return;
    }
  }
}
