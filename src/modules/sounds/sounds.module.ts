import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SoundsController } from './sounds.controller';
import { SoundsService } from './sounds.service';
import { FeedModule } from '../feeds/feed.module';
import { MediaModule } from '../media/media.module';
import { Media } from '../media/entities/media.entity';

@Module({
  imports: [FeedModule, MediaModule, TypeOrmModule.forFeature([Media])],
  controllers: [SoundsController],
  providers: [SoundsService],
  exports: [SoundsService],
})
export class SoundsModule {}

