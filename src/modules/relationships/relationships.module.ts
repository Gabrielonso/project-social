import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Follow } from '../engagements/entities/follow.entity';
import { User } from '../user/entity/user.entity';
import { FollowsService } from '../engagements/services/follows.services';
import { RelationshipsController } from './relationships.controller';
import { BlocksService } from '../engagements/services/blocks.services';
import { Block } from '../engagements/entities/block.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Follow, User, Block])],
  providers: [FollowsService, BlocksService],
  controllers: [RelationshipsController],
})
export class RelationshipsModule {}
