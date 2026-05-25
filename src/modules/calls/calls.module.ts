import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CallService } from './services/call.service';
import { LiveKitService } from './services/livekit.service';
import { CallSessionService } from './services/call-session.service';
import { CallLogService } from './services/call-log.service';
import { LiveKitWebhookService } from './services/livekit-webhook.service';
import { LiveKitWebhookController } from './controllers/livekit-webhook.controller';
import { CallSession } from './entities/call-session.entity';
import { User } from '../user/entity/user.entity';
import { Block } from '../engagements/entities/block.entity';
import { ChatMessage } from '../chats/entities/chat-message.entity';
import { RealtimeModule } from 'src/realtime/realtime.module';
import { UserDisplayModule } from '../user/user-display.module';
import { ChatsModule } from '../chats/chats.module';
import { NotificationModule } from '../notification/notification.module';
import { RedisModule } from 'src/common/redis/redis.module';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    UserDisplayModule,
    NotificationModule,
    forwardRef(() => RealtimeModule),
    forwardRef(() => ChatsModule),
    TypeOrmModule.forFeature([CallSession, User, Block, ChatMessage]),
  ],
  controllers: [LiveKitWebhookController],
  providers: [
    CallService,
    LiveKitService,
    CallSessionService,
    CallLogService,
    LiveKitWebhookService,
  ],
  exports: [CallService],
})
export class CallsModule {}
