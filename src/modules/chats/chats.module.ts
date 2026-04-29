import { Module } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { ChatMessageListener } from './listeners/chat-message.listener';

import { WsGateway } from 'src/realtime/gateway/ws.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Chat } from './entities/chat.entity';
import { ChatParticipant } from './entities/chat-participant.entity';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth/auth.service';
import { EventBus } from 'src/events/event-bus.service';
import { UserService } from '../user/user.service';
import { User } from '../user/entity/user.entity';

import { AccountActivityModule } from '../account-activity/account-activity.module';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatController } from './chat.controller';
import { MessageReceipt } from './entities/message-receipt.entity';
import { PresenceService } from 'src/realtime/services/presence.service';

@Module({
  providers: [
    ChatsService,
    ChatMessageListener,
    WsGateway,
    JwtService,
    AuthService,
    EventBus,
    UserService,
    PresenceService,
  ],
  imports: [
    TypeOrmModule.forFeature([
      Chat,
      ChatParticipant,
      User,
      ChatMessage,
      MessageReceipt,
    ]),
    AccountActivityModule,
  ],
  controllers: [ChatController],
})
export class ChatsModule {}
