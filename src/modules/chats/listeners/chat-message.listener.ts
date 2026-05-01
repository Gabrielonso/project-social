import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { WsGateway } from 'src/realtime/gateway/ws.gateway';
import { CreateMessageDto } from 'src/modules/chats/dtos/create-message.dto';
import { ChatsService } from '../chats.service';
import { Repository } from 'typeorm';
import { MessageReceipt } from '../entities/message-receipt.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { PresenceService } from 'src/realtime/services/presence.service';
import { EditMessageDto } from '../dtos/edit-message.dto';
import { DeleteMessageDto } from '../dtos/delete-message.dto';
import { ChatMessage } from '../entities/chat-message.entity';
import { DeleteMessageMode } from '../enums/message.enum';

@Injectable()
export class ChatMessageListener {
  constructor(
    private readonly wsGateway: WsGateway, // shared gateway
    private readonly chatService: ChatsService,
    @InjectRepository(MessageReceipt)
    private messageReceiptRepo: Repository<MessageReceipt>,
    private presenceService: PresenceService,
  ) {}

  @OnEvent('chat.send_message')
  async handleSendMessage(payload: CreateMessageDto) {
    try {
      let chatId = payload.chatId;

      if (!chatId && !payload?.receiverUserId) {
        throw new Error('Invalid chat or receiver ID');
      }

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
        const status = this.presenceService.getStatus(userId);
        await this.messageReceiptRepo.save({
          message,
          user: { id: userId },
          messageId: message.id,
          userId,
          ...(status !== 'offline' && {
            delivered: true,
            deliveredAt: new Date(),
          }),
        });

        this.wsGateway.emitToUser(userId, 'chat.new_message', {
          success: true,
          data: message,
        });
      }
      this.wsGateway.emitToUser(payload.userId, 'chat.message_sent', {
        messageId: message.id,
      });

      // 🔥 5. Notify chat room (for active users)
      this.wsGateway.emitToRoom(`chat:${chatId}`, 'chat.new_message', {
        success: true,
        data: message,
      });
    } catch (error: unknown) {
      console.error('Message failed:', error);

      // 🔥 send error back ONLY to sender
      const errorCodeMesssage =
        error instanceof Error ? error.message : 'UNKNOWN_ERROR';

      this.wsGateway.emitToUser(payload.userId, 'chat.error', {
        success: false,
        error: {
          code: errorCodeMesssage,
          message: 'Failed to send message',
        },
      });
    }
  }

  @OnEvent('chat.edit_message')
  async handleEditMessage(payload: EditMessageDto) {
    try {
      const message: ChatMessage | null = await this.chatService.getMessageById(
        payload.messageId,
      );

      if (!message) throw new Error('MESSAGE_NOT_FOUND');

      if (message.senderId !== payload.userId) {
        throw new Error('UNAUTHORIZED');
      }
      if (payload?.text) message.text = payload.text;

      message.edited = true;
      message.editedAt = new Date();

      await this.chatService.saveMessage(message);

      const participants = await this.chatService.getChatParticipants(
        message.chatId,
      );

      // 🔥 notify all users
      for (const p of participants) {
        this.wsGateway.emitToUser(p.userId, 'chat.message_edited', {
          messageId: message.id,
          text: message.text,
          edited: true,
        });
      }
    } catch (error) {
      console.error('Edit message failed:', error);
      const errorCodeMesssage =
        error instanceof Error ? error.message : 'UNKNOWN_ERROR';

      this.wsGateway.emitToUser(payload.userId, 'chat.error', {
        success: false,
        error: {
          code: errorCodeMesssage,
          message: 'Failed to edit message',
        },
      });
    }
  }

  @OnEvent('chat.delete_message')
  async handleDeleteMessage(payload: DeleteMessageDto) {
    try {
      const message = await this.chatService.getMessageById(payload.messageId);

      if (!message) throw new Error('MESSAGE_NOT_FOUND');

      // 🔥 DELETE FOR ME
      if (payload.mode === DeleteMessageMode.ME) {
        await this.chatService.markMessageDeleteForUser(
          message,
          payload.userId,
        );

        this.wsGateway.emitToUser(payload.userId, 'chat.message_deleted', {
          messageId: payload.messageId,
          mode: payload.mode,
        });

        return;
      }

      // 🔥 DELETE FOR EVERYONE
      if (message.senderId !== payload.userId) {
        throw new Error('UNAUTHORIZED');
      }

      message.deleted = true;
      message.text = null;

      await this.chatService.saveMessage(message);

      const participants = await this.chatService.getChatParticipants(
        message.chatId,
      );

      for (const p of participants) {
        this.wsGateway.emitToUser(p.userId, 'chat.message_deleted', {
          messageId: payload.messageId,
          mode: payload.mode,
        });
      }
    } catch (error) {
      const errorCodeMesssage =
        error instanceof Error ? error.message : 'UNKNOWN_ERROR';

      this.wsGateway.emitToUser(payload.userId, 'chat.error', {
        success: false,
        error: {
          code: errorCodeMesssage,
          message: 'Failed to delete message',
        },
      });
    }
  }

  @OnEvent('chat.read')
  async handleReadChat(payload: { chatId: string; userId: string }) {
    try {
      const chatId = payload.chatId;

      await this.chatService.markRead(chatId, payload.userId);
    } catch (error: unknown) {
      console.error('Read message failed:', error);
      throw error;
    }
  }
}
