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

      // 👇 If chatId not provided → create/find chat
      if (!chatId && payload.receiverUserId) {
        const chat = await this.chatService.getOrCreateOneToOneChat(
          payload.userId,
          payload.receiverUserId,
        );

        chatId = chat.id;
      }

      const message = await this.chatService.createMessage({
        ...payload,
        chatId,
      });

      if (!payload?.chatId) {
        this.wsGateway.emitToUser(
          `${payload.receiverUserId}`,
          'chat.new_message',
          message,
        );
      } else {
        this.wsGateway.emitToRoom(
          `chat:${chatId}`,
          'chat.new_message',
          message,
        );
      }
    } catch (error) {
      throw error;
    }
  }
}
