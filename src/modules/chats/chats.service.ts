import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ChatParticipant } from './entities/chat-participant.entity';
import { DataSource, In, Repository } from 'typeorm';
import { Chat } from './entities/chat.entity';
import { CreateMessageDto } from './dtos/create-message.dto';
import { ChatMessage } from './entities/chat-message.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { successResponse } from 'src/common/helpers/response.helper';
import { ChatMessagesFilterDto } from './dtos/chat-messages-filter.dto';
import { ChatsFilterDto } from './dtos/chats-filter.dto';
import { MessageReceipt } from './entities/message-receipt.entity';
import { WsGateway } from 'src/realtime/gateway/ws.gateway';
import { CreateGroupChatDto } from './dtos/create-group-chat.dto';
import { User } from '../user/entity/user.entity';
import { EditGroupChatDto } from './dtos/edit-group-chat.dto ';
import { AddChatMembersDto } from './dtos/add-chat-members.dto ';

@Injectable()
export class ChatsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ChatMessage)
    private chatMessageRepo: Repository<ChatMessage>,
    @InjectRepository(ChatParticipant)
    private chatParticipantRepo: Repository<ChatParticipant>,
    @InjectRepository(MessageReceipt)
    private messageReceiptRepo: Repository<MessageReceipt>,
    private readonly wsGateway: WsGateway,
    @InjectRepository(Chat)
    private chatRepo: Repository<Chat>,
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
              lastMessage: message,
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

      const chatsQuery = this.chatRepo
        .createQueryBuilder('chat')
        .innerJoin(
          'chat.participants',
          'myParticipant',
          'myParticipant.userId = :userId',
          { userId },
        )
        .leftJoinAndSelect('chat.participants', 'participants')
        .leftJoin('participants.user', 'user')
        .addSelect([
          'user.id',
          'user.firstName',
          'user.lastName',
          'user.username',
          'user.profilePicture',
        ])
        .leftJoinAndSelect('chat.lastMessage', 'lastMessage');

      // const chatParticipantsQuery = this.chatParticipantRepo
      //   .createQueryBuilder('chat_participant')
      //   .leftJoinAndSelect('chat_participant.chat', 'chat')
      //   .leftJoinAndSelect('chat.lastMessage', 'lastMessage')
      //   .leftJoin('chat_participant.user', 'user')
      //   .where('user.id = :userId', { userId })
      //   .leftJoinAndMapOne(
      //     'chat.participant',
      //     'chat.participants',
      //     'participant',
      //     `participant.userId != :me`,
      //     { me: userId },
      //   )
      //   .leftJoinAndSelect('participant.user', 'p');

      chatsQuery.orderBy('chat.createdAt', 'DESC');
      if (limit) {
        chatsQuery.skip(skip).take(limit);
      }

      const [data, total] = await chatsQuery.getManyAndCount();

      return successResponse('Operation Successful', {
        data,
        currentPage: page,
        totalPages: limit ? Math.ceil(total / limit) : 1,
      });
    } catch (error) {
      throw error;
    }
  }

  async getChatMessages(authUserId: string, query: ChatMessagesFilterDto) {
    try {
      const page = Number(query.page) || 1;
      const limit = query.limit ? Number(query.limit) : null;
      const skip = limit ? (page - 1) * limit : 0;

      if (!query?.chatId && !query?.userId) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Invalid User or Chat ID',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      let chatId = query?.chatId;
      if (query?.userId) {
        const chatKey = this.generateChatKey(query?.userId, authUserId);

        const chat = await this.chatRepo.findOne({ where: { chatKey } });
        if (chat) {
          chatId = chat.id;
        }
      }

      const chatMessagesQuery = this.chatMessageRepo
        .createQueryBuilder('message')
        .leftJoinAndSelect(
          'message.receipts',
          'receipt',
          // 'receipt.userId = :userId',
          // {
          //   userId: authUserId,
          // },
        )
        .where('message.chatId = :chatId', { chatId })
        .andWhere(
          'message.senderId = :userId AND message.deletedForMe = false',
          { userId: authUserId },
        )
        .orWhere('message.senderId = :userId AND message.deleted = true', {
          userId: authUserId,
        })
        .orWhere('receipt.userId = :userId AND receipt.deleted = false', {
          userId: authUserId,
        })
        .orWhere('receipt.userId = :userId AND message.deleted = true', {
          userId: authUserId,
        })
        .orderBy('message.createdAt', 'DESC');

      if (limit) {
        chatMessagesQuery.skip(skip).take(limit);
      }

      const [messages, total] = await chatMessagesQuery.getManyAndCount();

      if (!messages.length) {
        return successResponse('Operation Successful', {
          data: [],
          currentPage: page,
          totalPages: 0,
        });
      }

      // const messageIds = messages.map((m) => m.id);

      // const participants = await this.chatParticipantRepo.find({
      //   where: { chatId },
      //   select: ['userId'],
      // });

      // const participantIds = participants.map((p) => p.userId);

      // const receipts = await this.messageReceiptRepo
      //   .createQueryBuilder('receipt')
      //   .where('receipt.message_id IN (:...messageIds)', { messageIds })
      //   .andWhere('receipt.user_id IN (:...participantIds)', { participantIds })
      //   .getMany();

      // // Index receipts for fast lookup
      // const receiptMap = new Map<string, any>();

      // for (const r of receipts) {
      //   receiptMap.set(r.messageId, r);
      // }

      // const data = messages.map((msg) => {
      //   const receipt = receiptMap.get(msg.id);

      //   let status: 'sent' | 'delivered' | 'read' = 'sent';

      //   if (receipt?.read) {
      //     status = 'read';
      //   } else if (receipt?.delivered) {
      //     status = 'delivered';
      //   }

      //   return {
      //     ...msg,
      //     status,
      //     deliveredAt: receipt?.deliveredAt || null,
      //     readAt: receipt?.readAt || null,
      //   };
      // });
      // ?.filter((msg) => {
      //   if (msg.senderId == authUserId && msg.deletedForMe) {
      //     return;
      //   }
      //   return msg;
      // })
      // .map(({ deletedForMe, ...rest }) => rest);

      return successResponse('Operation Successful', {
        data: messages,
        currentPage: page,
        totalPages: limit ? Math.ceil(total / limit) : 1,
      });
    } catch (error) {
      throw error;
    }
  }

  async getChatParticipants(chatId: string): Promise<ChatParticipant[]> {
    try {
      const participants = await this.chatParticipantRepo.find({
        where: { chatId },
      });
      return participants;
    } catch (error) {
      throw error;
    }
  }

  async markDelivered(chatId: string, userId: string) {
    try {
      const receipts = await this.messageReceiptRepo.find({
        where: {
          user: { id: userId },
          delivered: false,
        },
        relations: ['message'],
      });

      for (const r of receipts) {
        r.delivered = true;
        r.deliveredAt = new Date();
      }

      await this.messageReceiptRepo.save(receipts);

      // notify sender
      for (const r of receipts) {
        this.wsGateway.emitToUser(
          r.message.sender.id,
          'chat.message_delivered',
          {
            messageId: r.message.id,
            userId,
          },
        );
      }
    } catch (error) {
      throw error;
    }
  }

  async markRead(chatId: string, userId: string) {
    try {
      const receipts = await this.messageReceiptRepo.find({
        where: {
          user: { id: userId },
          read: false,
          message: { chat: { id: chatId } },
        },
        relations: ['message.sender'],
      });

      for (const r of receipts) {
        r.read = true;
        r.readAt = new Date();
      }

      await this.messageReceiptRepo.save(receipts);

      // notify senders
      for (const r of receipts) {
        this.wsGateway.emitToUser(r?.message?.sender?.id, 'chat.message_read', {
          messageId: r?.message?.id,
          userId,
        });
      }
    } catch (error) {
      throw error;
    }
  }

  async getMessageById(messageId: string): Promise<ChatMessage | null> {
    try {
      return await this.dataSource.manager.transaction(
        async (entityManager) => {
          const chatMessageRepo = entityManager.getRepository(ChatMessage);

          const message = chatMessageRepo.findOne({
            where: { id: messageId },
          });

          return message;
        },
      );
    } catch (error) {
      throw error;
    }
  }

  async saveMessage(message: ChatMessage) {
    try {
      return await this.dataSource.manager.transaction(
        async (entityManager) => {
          const chatMessageRepo = entityManager.getRepository(ChatMessage);

          const savedMessage = await chatMessageRepo.save(message);

          return savedMessage;
        },
      );
    } catch (error) {
      throw error;
    }
  }

  async markMessageDeleteForUser(message: ChatMessage, userId: string) {
    try {
      await this.dataSource.manager.transaction(async (entityManager) => {
        const chatMessageRepo = entityManager.getRepository(ChatMessage);
        const messageReceiptRepo = entityManager.getRepository(MessageReceipt);

        if (message.senderId == userId) {
          await chatMessageRepo.update(
            { id: message.id },
            {
              deletedForMe: true,
            },
          );
        } else {
          const now = new Date().toISOString();
          await messageReceiptRepo.update(
            {
              userId,
              messageId: message.id,
            },
            {
              deleted: true,
              deletedAt: now,
            },
          );
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async createGroupChat(dto: CreateGroupChatDto, userId: string) {
    try {
      return await this.dataSource.manager.transaction(
        async (entityManager) => {
          const chatRepo = entityManager.getRepository(Chat);
          const userRepo = entityManager.getRepository(User);
          const chatParticipantRepo =
            entityManager.getRepository(ChatParticipant);
          const groupChat = chatRepo.create({
            name: dto.name,
            about: dto.about,
            photo: dto.photo,
            isGroup: true,
          });
          const savedGroupChat = await chatRepo.save(groupChat);
          const participants = [
            {
              chat: savedGroupChat,
              user: { id: userId },
              chatId: savedGroupChat.id,
              userId: userId,
              isAdmin: true,
            },
          ];
          if (dto.users && dto?.users?.length) {
            const users = await userRepo.find({
              where: { id: In(dto.users.filter((user) => user !== userId)) },
            });
            if (users?.length) {
              for (let i = 0; i < users.length; i++) {
                const user = users[i];
                participants.push({
                  chat: savedGroupChat,
                  user: { id: user.id },
                  chatId: savedGroupChat.id,
                  userId: user.id,
                  isAdmin: false,
                });
              }
            }
          }

          await chatParticipantRepo.save(participants);

          return successResponse('Successfully created group chat');
        },
      );
    } catch (error) {
      throw error;
    }
  }

  async editGroupChatInfo(
    chatId: string,
    dto: EditGroupChatDto,
    userId: string,
  ) {
    try {
      return await this.dataSource.manager.transaction(
        async (entityManager) => {
          const chatRepo = entityManager.getRepository(Chat);
          const chat = await chatRepo.findOne({
            where: { id: chatId },
            relations: ['participants'],
          });
          if (!chat) {
            throw new HttpException(
              {
                statusCode: HttpStatus.NOT_FOUND,
                message: 'Chat not found',
              },
              HttpStatus.NOT_FOUND,
            );
          }

          const userParticipant = chat.participants.find(
            (participant) => (participant.userId = userId),
          );

          if (!userParticipant || !userParticipant.isAdmin) {
            throw new HttpException(
              {
                statusCode: HttpStatus.UNAUTHORIZED,
                message: 'You are not allowed to update chat',
              },
              HttpStatus.UNAUTHORIZED,
            );
          }

          const { name, about, photo } = dto;

          if (name !== undefined) chat.name = name;
          if (about !== undefined) chat.about = about;
          if (photo !== undefined) chat.photo = photo;

          await chatRepo.save(chat);

          return successResponse('Successfully updated chat info');
        },
      );
    } catch (error) {
      throw error;
    }
  }

  async addChatMembers(chatId: string, dto: AddChatMembersDto, userId: string) {
    try {
      return await this.dataSource.manager.transaction(
        async (entityManager) => {
          const chatRepo = entityManager.getRepository(Chat);
          const userRepo = entityManager.getRepository(User);
          const chatParticipantRepo =
            entityManager.getRepository(ChatParticipant);
          const chat = await chatRepo.findOne({
            where: { id: chatId },
            relations: ['participants'],
          });
          if (!chat) {
            throw new HttpException(
              {
                statusCode: HttpStatus.NOT_FOUND,
                message: 'Chat not found',
              },
              HttpStatus.NOT_FOUND,
            );
          }

          const userParticipant = chat.participants.find(
            (participant) => (participant.userId = userId),
          );

          if (!userParticipant || !userParticipant.isAdmin) {
            throw new HttpException(
              {
                statusCode: HttpStatus.UNAUTHORIZED,
                message: 'You are not allowed to update chat',
              },
              HttpStatus.UNAUTHORIZED,
            );
          }
          const participants: {
            chat: Chat;
            user: User;
            chatId: string;
            userId: string;
            isAdmin: boolean;
          }[] = [];
          if (dto.users && dto?.users?.length) {
            const users = await userRepo.find({
              where: { id: In(dto.users.filter((user) => user !== userId)) },
            });
            if (users?.length) {
              for (let i = 0; i < users.length; i++) {
                const user = users[i];
                participants.push({
                  chat,
                  user,
                  chatId: chat.id,
                  userId: user.id,
                  isAdmin: false,
                });
              }
            }
          }

          await chatParticipantRepo.save(participants);

          return successResponse('Successfully added users to chat');
        },
      );
    } catch (error) {
      throw error;
    }
  }

  async exitGroupChat(chatId: string, userId: string) {
    try {
      return await this.dataSource.manager.transaction(
        async (entityManager) => {
          const chatRepo = entityManager.getRepository(Chat);
          const chatParticipantRepo =
            entityManager.getRepository(ChatParticipant);
          const chat = await chatRepo.findOne({
            where: { id: chatId },
            relations: ['participants'],
          });
          if (!chat) {
            throw new HttpException(
              {
                statusCode: HttpStatus.NOT_FOUND,
                message: 'Chat not found',
              },
              HttpStatus.NOT_FOUND,
            );
          }

          const userParticipant = chat.participants.find(
            (participant) => (participant.userId = userId),
          );

          if (userParticipant && chat.participants?.length == 1) {
            //Last person in the chat, you can delete chat if need be
          }

          await chatParticipantRepo.delete({
            userId: userParticipant?.userId,
            chatId: userParticipant?.chatId,
          });

          return successResponse('Successfully exited chat');
        },
      );
    } catch (error) {
      throw error;
    }
  }

  async getChatMembers(chatId: string) {
    try {
      const participants = await this.chatParticipantRepo.find({
        where: { chatId },
        relations: ['user'],
      });
      return successResponse('Successfully fetched meembers', participants);
    } catch (error) {
      throw error;
    }
  }
}
