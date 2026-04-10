import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { JobQueue, JobType, SendPushJob } from 'src/common/enums/jobs.enum';
import { OneSignalService } from './onesignal.service';

@Processor(JobQueue.NOTIFICATIONS)
export class NotificationProcessor extends WorkerHost {
  constructor(private readonly oneSignalService: OneSignalService) {
    super();
  }

  async process(job: Job<SendPushJob>) {
    if (job.name !== JobType.SEND_PUSH_NOTIFICATION) return;

    const { userId, title, body } = job.data;
    await this.oneSignalService.sendPush({ userId, title, body });
  }
}
