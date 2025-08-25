import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import Wallet from './entity/wallet.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entity/user.entity';

import { WalletProcessor } from './wallet.worker';
import { JobQueue } from 'src/interfaces/global';
import { BullModule } from '@nestjs/bullmq';

@Module({
  controllers: [WalletController],
  providers: [WalletService, WalletProcessor],
  imports: [
    TypeOrmModule.forFeature([User, Wallet]),
    BullModule.registerQueue(
      {
        name: JobQueue.WALLETS,
        // limiter: { duration: 10000, max: 20 },
      },
      { name: JobQueue.NOTIFICATIONS },
    ),
  ],
  exports: [WalletService],
})
export class WalletModule {}
