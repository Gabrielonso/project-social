import { Injectable } from '@nestjs/common';
import { ChatParticipant } from './entities/chat-participant.entity';
import { DataSource, Repository } from 'typeorm';
import { Chat } from './entities/chat.entity';
import { CreateMessageDto } from './dtos/create-message.dto';
import { ChatMessage } from './entities/chat-message.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { successResponse } from 'src/common/helpers/response.helper';
import { ChatMessagesFilterDto } from './dtos/chat-messages-filter.dto';
import { ChatsFilterDto } from './dtos/chats-filter.dto';

@Injectable()
export class ChatsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Chat)
    private chatRepo: Repository<Chat>,
    @InjectRepository(ChatMessage)
    private chatMessageRepo: Repository<ChatMessage>,
    @InjectRepository(ChatParticipant)
    private chatParticipantRepo: Repository<ChatParticipant>,
  ) {}

  generateChatKey(user1: string, user2: string) {
    return [user1, user2].sort().join('_');
  }
  async getOrCreateOneToOneChat(userA: string, userB: string) {
    try {
      return await this.dataSource.manager.transaction(
        async (entityManager) => {
          const chatParticipantRepo =
            entityManager.getRepository(ChatParticipant);
          const chatRepo = entityManager.getRepository(Chat);
          const chatKey = this.generateChatKey(userA, userB);

          let chat = await chatRepo.findOne({
            where: { chatKey },
            relations: ['participants'],
          });

          if (chat) return chat;

          // 🔥 Create new chat
          chat = chatRepo.create({
            chatKey,
            isGroup: false,
          });

          const savedChat = await chatRepo.save(chat);

          // add participants
          await chatParticipantRepo.save([
            {
              chat: savedChat,
              user: { id: userA },
              chatId: savedChat.id,
              userId: userA,
            },
            {
              chat,
              user: { id: userB },
              chatId: savedChat.id,
              userId: userB,
            },
          ]);

          return chat;
        },
      );
    } catch (error) {
      throw error;
    }
  }

  async createMessage(data: CreateMessageDto) {
    try {
      return await this.dataSource.manager.transaction(
        async (entityManager) => {
          const chatMessageRepo = entityManager.getRepository(ChatMessage);
          const chatRepo = entityManager.getRepository(Chat);

          const message = chatMessageRepo.create({
            chat: { id: data.chatId },
            sender: { id: data.userId },
            text: data.text,
            chatId: data.chatId,
            senderId: data.userId,
          });

          await chatMessageRepo.save(message);

          // update last message (IMPORTANT for performance)

          await chatRepo.update(
            { id: data.chatId },
            {
              lastMessageId: message.id,
            },
          );

          return message;
        },
      );
    } catch (error) {
      throw error;
    }
  }

  async getMyChats(userId: string, chatsFilterDto: ChatsFilterDto) {
    try {
      const page = Number(chatsFilterDto.page) || 1;
      const limit = chatsFilterDto.limit ? Number(chatsFilterDto.limit) : null;
      const skip = limit ? (page - 1) * limit : 0;
      const chatParticipantsQuery = this.chatParticipantRepo
        .createQueryBuilder('chat_participant')
        .leftJoinAndSelect('chat_participant.chat', 'chat')
        .leftJoin('chat_participant.user', 'user')
        .where('user.id = :userId', { userId })
        .leftJoinAndMapOne(
          'chat.participant',
          'chat.participants',
          'participant',
          `participant.userId != :me`,
          { me: userId },
        )
        .leftJoinAndSelect('participant.user', 'p');

      chatParticipantsQuery.orderBy('chat_participant.joinedAt', 'DESC');
      if (limit) {
        chatParticipantsQuery.skip(skip).take(limit);
      }

      const [data, total] = await chatParticipantsQuery.getManyAndCount();

      return successResponse('Operation Successful', {
        data,
        currentPage: page,
        totalPages: limit ? Math.ceil(total / limit) : 1,
      });
    } catch (error) {
      throw error;
    }
  }

  async getChatMessages(
    userId: string,
    chatId: string,
    query: ChatMessagesFilterDto,
  ) {
    try {
      const page = Number(query.page) || 1;
      const limit = query.limit ? Number(query.limit) : null;
      const skip = limit ? (page - 1) * limit : 0;
      const chatMessagesQuery = this.chatMessageRepo
        .createQueryBuilder('message')
        .leftJoin('message.chat', 'chat')
        .where('chat.id = :chatId', { chatId });

      chatMessagesQuery.orderBy('message.createdAt', 'DESC');
      if (limit) {
        chatMessagesQuery.skip(skip).take(limit);
      }

      const [data, total] = await chatMessagesQuery.getManyAndCount();

      return successResponse('Operation Successful', {
        data,
        currentPage: page,
        totalPages: limit ? Math.ceil(total / limit) : 1,
      });
    } catch (error) {
      throw error;
    }
  }
}
