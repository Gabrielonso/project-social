import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Follow } from '../engagements/entities/follow.entity';
import { User } from '../user/entity/user.entity';
import { FollowsService } from '../engagements/services/follows.services';
import { RelationshipsController } from './relationships.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Follow, User])],
  providers: [FollowsService],
  controllers: [RelationshipsController],
})
export class RelationshipsModule {}
