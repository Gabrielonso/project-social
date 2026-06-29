import { OnEvent } from '@nestjs/event-emitter';
import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
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
import { MediaUploadFolder } from 'src/modules/media/enums/media-upload-folder.enum';
import { NotificationDispatcher } from 'src/modules/notification/notification.dispatcher';
import { NotificationEventType } from 'src/modules/notification/interfaces/notification-event.types';
import { User } from 'src/modules/user/entity/user.entity';

@Injectable()
export class ChatMessageListener {
  constructor(
    private readonly wsGateway: WsGateway, // shared gateway
    private readonly chatService: ChatsService,
    @InjectRepository(MessageReceipt)
    private messageReceiptRepo: Repository<MessageReceipt>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private presenceService: PresenceService,
    private readonly notificationDispatcher: NotificationDispatcher,
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

      if (payload.attachmentMediaIds?.length) {
        if (!payload.userId) {
          throw new Error('userId is required for attachment media IDs');
        }
      }
      //  else if (payload.attachments) {
      //   if (!payload.attachments.length || payload.attachments.length == 0)
      //     throw new Error('No content in attachments');

      //   for (let index = 0; index < payload.attachments.length; index++) {
      //     const attachment = payload.attachments[index];

      //     if (
      //       !attachment.type ||
      //       !attachment.provider ||
      //       !attachment.originalUrl ||
      //       !attachment.sourceIdOrKey
      //     ) {
      //       throw new HttpException(
      //         {
      //           statusCode: HttpStatus.BAD_REQUEST,
      //           message:
      //             'Please specify type, provider, url and key for all attachments',
      //         },
      //         HttpStatus.BAD_REQUEST,
      //       );
      //     }

      //     if (
      //       !attachment.sourceIdOrKey.startsWith(
      //         `${MediaUploadFolder.MESSAGES}/${payload.userId}/`,
      //       )
      //     ) {
      //       throw new ForbiddenException('Invalid media ownership or folder');
      //     }
      //   }
      // }
      // 🔥 3. Get REAL participants from DB
      const participants = await this.chatService.getChatParticipants(chatId);

      const participantUser = participants.find(
        (participant) => participant.userId == payload.userId,
      );
      if (!participantUser) {
        throw new HttpException(
          {
            statusCode: HttpStatus.UNAUTHORIZED,
            message: 'You cannot send message to this chat',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }
      // 🔥 2. Create message
      const message = await this.chatService.createMessage({
        ...payload,
        chatId,
      });

      // 🔥 4. Notify each participant (EXCEPT sender)
      const recipientIds = participants
        .map((p) => p.userId)
        .filter((id) => id && id !== payload.userId);

      const statusMap = await this.presenceService.getStatuses(recipientIds);
      const receiptsToSave = recipientIds.map((userId) => {
        const status = statusMap.get(userId) || 'offline';
        return {
          message,
          user: { id: userId },
          messageId: message.id,
          userId,
          ...(status !== 'offline' && {
            delivered: true,
            deliveredAt: new Date(),
          }),
        } as MessageReceipt;
      });

      const receipts = receiptsToSave.length
        ? await this.messageReceiptRepo.save(receiptsToSave)
        : [];

      const sender = await this.userRepo.findOne({
        where: { id: payload.userId },
        select: ['id', 'username'],
      });

      for (const userId of recipientIds) {
        const status = statusMap.get(userId) || 'offline';
        if (status === 'offline' || status === 'away') {
          await this.notificationDispatcher.notify({
            event: NotificationEventType.CHAT_MESSAGE,
            recipientId: userId,
            actorId: payload.userId,
            context: {
              actorUsername: sender?.username,
              chatId,
              messageId: message.id,
              messagePreview: message.text?.slice(0, 80),
            },
          });
        }

        this.wsGateway.emitToUser(userId, 'chat.new_message', {
          success: true,
          data: message,
        });
      }
      this.wsGateway.emitToUser(payload.userId, 'chat.message_sent', {
        ...message,
        receipts,
        tempId: payload.tempId,
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

      await this.chatService.deleteMessageForEveryone(
        payload.messageId,
        payload.userId,
      );

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

  // Delivery sweep: when a user's socket connects we flip every still-
  // undelivered receipt for them to delivered=true. This is the catch-up
  // path for messages that arrived while they were offline (the send-time
  // path in handleSendMessage only marks delivered for users who are
  // already online when the message is created).
  @OnEvent('chat.user_connected')
  async handleUserConnected(payload: { userId: string }) {
    try {
      if (!payload?.userId) return;
      await this.chatService.markDelivered(payload.userId);
    } catch (error: unknown) {
      console.error('Delivery sweep on connect failed:', error);
    }
  }
}
