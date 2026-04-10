import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountActivity } from './entities/account-activity.entity';
import { AccountActivityService } from './account-activity.service';

@Module({
  imports: [TypeOrmModule.forFeature([AccountActivity])],
  providers: [AccountActivityService],
  exports: [AccountActivityService],
})
export class AccountActivityModule {}
