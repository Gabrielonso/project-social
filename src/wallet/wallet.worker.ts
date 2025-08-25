import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JobQueue } from 'src/interfaces/global';
import { Processor } from '@nestjs/bullmq';

@Processor(JobQueue.WALLETS)
export class WalletProcessor {
  constructor(
    private readonly dataSource: DataSource,
    private configService: ConfigService,
  ) {}
  // @Process({ name: 'create-payment-account' })
  handlePaymentAccountJob() {
    try {
      console.log('first');
    } catch (error) {
      throw error;
    }
  }
}
