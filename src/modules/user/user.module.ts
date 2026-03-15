import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { FollowsService } from '../engagements/services/follows.services';
import { Follow } from '../engagements/entities/follow.entity';

@Module({
  controllers: [UserController],
  providers: [UserService, FollowsService],
  exports: [UserService],
  imports: [TypeOrmModule.forFeature([User, Follow])],
})
export class UserModule {}
