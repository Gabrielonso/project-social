import { TypeOrmModule } from '@nestjs/typeorm';
import { LikesService } from './services/likes.services';
import { Like } from './entities/like.entity';
import { EngagementsController } from './engagement.controller';
import { Module } from '@nestjs/common';

@Module({
  providers: [LikesService],
  controllers: [EngagementsController],
  imports: [TypeOrmModule.forFeature([Like])],
})
export class EngagementsModule {}
