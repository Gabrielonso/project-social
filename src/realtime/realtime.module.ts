import { Module, forwardRef } from '@nestjs/common';
import { CallsModule } from 'src/modules/calls/calls.module';
import { WsGateway } from './gateway/ws.gateway';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from 'src/modules/auth/auth.service';
import { UserService } from 'src/modules/user/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/modules/user/entity/user.entity';
import { AccountActivityService } from 'src/modules/account-activity/account-activity.service';
import { AccountActivity } from 'src/modules/account-activity/entities/account-activity.entity';
import { EventBus } from 'src/events/event-bus.service';
import { PresenceService } from './services/presence.service';
import { UserDisplayService } from 'src/modules/user/user-display.service';

@Module({
  imports: [
    JwtModule,
    TypeOrmModule.forFeature([User, AccountActivity]),
    forwardRef(() => CallsModule),
  ],
  providers: [
    WsGateway,
    AuthService,
    UserService,
    AccountActivityService,
    EventBus,
    PresenceService,
    UserDisplayService,
  ],
  exports: [WsGateway, PresenceService],
})
export class RealtimeModule {}
