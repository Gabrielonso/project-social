import { Module } from '@nestjs/common';
import { ThoughtService } from './thought.service';
import { ThoughtController } from './thought.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Thought } from './entities/thought.entity';
import { Ad } from '../ads/entities/ads.entity';
import { AccountActivityModule } from '../account-activity/account-activity.module';

@Module({
  providers: [ThoughtService],
  controllers: [ThoughtController],
  imports: [TypeOrmModule.forFeature([Thought, Ad]), AccountActivityModule],
})
export class ThoughtModule {}
