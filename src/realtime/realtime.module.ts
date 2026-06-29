import { Module, forwardRef } from '@nestjs/common';
import { CallsModule } from 'src/modules/calls/calls.module';
import { WsGateway } from './gateway/ws.gateway';
import { JwtModule } from '@nestjs/jwt';
import { EventBus } from 'src/events/event-bus.service';
import { PresenceService } from './services/presence.service';

@Module({
  imports: [JwtModule, forwardRef(() => CallsModule)],
  providers: [WsGateway, EventBus, PresenceService],
  exports: [WsGateway, PresenceService],
})
export class RealtimeModule {}
