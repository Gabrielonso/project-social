import { Module, forwardRef } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { ChatMessageListener } from './listeners/chat-message.listener';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Chat } from './entities/chat.entity';
import { ChatParticipant } from './entities/chat-participant.entity';
import { User } from '../user/entity/user.entity';

import { AccountActivityModule } from '../account-activity/account-activity.module';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatController } from './chat.controller';
import { MessageReceipt } from './entities/message-receipt.entity';
import { RealtimeModule } from 'src/realtime/realtime.module';
import { UserDisplayModule } from '../user/user-display.module';
import { NotificationModule } from '../notification/notification.module';
import { MediaModule } from '../media/media.module';

@Module({
  providers: [ChatsService, ChatMessageListener],
  imports: [
    TypeOrmModule.forFeature([
      Chat,
      ChatParticipant,
      User,
      ChatMessage,
      MessageReceipt,
    ]),
    AccountActivityModule,
    forwardRef(() => RealtimeModule),
    NotificationModule,
    UserDisplayModule,
    forwardRef(() => MediaModule),
  ],
  controllers: [ChatController],
  exports: [ChatsService],
})
export class ChatsModule {}
