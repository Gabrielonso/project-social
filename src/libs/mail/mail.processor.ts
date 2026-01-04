import { ConfigService } from '@nestjs/config';
import { ZeptoMail } from 'src/common/zepto-mail';
import { Processor } from '@nestjs/bullmq';

@Processor('emails')
export class EmailProcessor {
  private mailgun: any;
  private domain: string;
  private zeptoMailService: ZeptoMail;
  constructor(private configService: ConfigService) {
    this.zeptoMailService = new ZeptoMail();
  }

  // @Process(JobType.SEND_EMAIL_ZEPTO)
  // async handleSendEmailZepto(job: Job) {
  //   const { recipient, subject, templateId, templateVariables } = job.data;
  //   await this.zeptoMailService.sendMailWithZepto({
  //     recipient,
  //     subject,
  //     template_id: templateId,
  //     template_variables: templateVariables,
  //     // cc: null,
  //     // bcc: null,
  //     // attachments: null,
  //     reply_to_email: '',
  //     allow_to_reply: false,
  //     send_attachment: false,
  //   });
  // }

  // @OnQueueFailed()
  // onFailed(job: Job, error: Error) {
  //   console.error(`Email Job failed: ${job.id} with error:`, error.message);
  //   console.log(`Attempt number ${job.attemptsMade}`);
  // }
}
