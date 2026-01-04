import { Module } from '@nestjs/common';
import { AdService } from './ad.service';
import { AdController } from './ad.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ad } from './entities/ads.entity';

@Module({
  providers: [AdService],
  controllers: [AdController],
  imports: [TypeOrmModule.forFeature([Ad])],
})
export class AdModule {}
