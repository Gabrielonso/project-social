import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { WsGateway } from 'src/realtime/gateway/ws.gateway';
import { CreateMessageDto } from 'src/modules/chats/dtos/create-message.dto';
import { ChatsService } from '../chats.service';

@Injectable()
export class ChatMessageListener {
  constructor(
    private readonly wsGateway: WsGateway, // shared gateway
    private readonly chatService: ChatsService,
  ) {}

  @OnEvent('chat.send_message')
  async handleSendMessage(payload: CreateMessageDto) {
    try {
      let chatId = payload.chatId;

      // 🔥 1. Create or get chat if needed
      if (!chatId && payload.receiverUserId) {
        const chat = await this.chatService.getOrCreateOneToOneChat(
          payload.userId,
          payload.receiverUserId,
        );

        chatId = chat.id;
      }

      if (!chatId) {
        throw new Error('ChatId could not be resolved');
      }

      // 🔥 2. Create message
      const message = await this.chatService.createMessage({
        ...payload,
        chatId,
      });

      // 🔥 3. Get REAL participants from DB
      const participants = await this.chatService.getChatParticipants(chatId);

      // 🔥 4. Notify each participant (EXCEPT sender)
      for (const participant of participants) {
        const userId = participant.userId;

        if (userId === payload.userId) continue;

        this.wsGateway.emitToUser(userId, 'chat.new_message', message);
      }

      // 🔥 5. Notify chat room (for active users)
      this.wsGateway.emitToRoom(`chat:${chatId}`, 'chat.new_message', message);
    } catch (error) {
      console.error('ChatMessageListener error:', error);
      throw error;
    }
  }
}
