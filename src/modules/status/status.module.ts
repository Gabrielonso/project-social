import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatusController } from './status.controller';
import { StatusService } from './status.service';
import { Status } from './entities/status.entity';
import { Media } from '../media/entities/media.entity';
import { User } from '../user/entity/user.entity';
import { Follow } from '../engagements/entities/follow.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Status, Media, User, Follow])],
  controllers: [StatusController],
  providers: [StatusService],
})
export class StatusModule {}

