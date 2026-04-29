import { Module } from '@nestjs/common';
import { WsGateway } from './gateway/ws.gateway';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from 'src/modules/auth/auth.service';
import { UserService } from 'src/modules/user/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/modules/user/entity/user.entity';
import { AccountActivityService } from 'src/modules/account-activity/account-activity.service';
import { AccountActivity } from 'src/modules/account-activity/entities/account-activity.entity';
import { EventBus } from 'src/events/event-bus.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Module({
  imports: [JwtModule, TypeOrmModule.forFeature([User, AccountActivity])],
  providers: [
    WsGateway,
    AuthService,
    UserService,
    AccountActivityService,
    EventBus,
    EventEmitter2,
  ],
  exports: [WsGateway],
})
export class RealtimeModule {}
