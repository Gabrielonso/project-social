import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { EmailProcessor } from './mail.processor';
import { BullModule } from '@nestjs/bullmq';
import { JobQueue } from 'src/common/enums/jobs.enum';

@Module({
  providers: [MailService, EmailProcessor],
  exports: [MailService],
  imports: [
    BullModule.registerQueue({
      name: JobQueue.EMAILS,
    }),
  ],
})
export class MailModule {}
