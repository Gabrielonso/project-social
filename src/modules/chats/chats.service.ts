import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ChatParticipant } from './entities/chat-participant.entity';
import { Brackets, DataSource, In, Repository } from 'typeorm';
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
import { MediaUploadFolder } from '../media/enums/media-upload-folder.enum';
import { MediaProvider } from '../media/enums/media-provider.enum';
import { MessageAttachment } from './entities/message-attachment.entity';
import { MediaStatus } from '../media/enums/media-status.enum';
import { Media } from '../media/entities/media.entity';

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
              joinedAt: new Date(),
            },
            {
              chat,
              user: { id: userB },
              chatId: savedChat.id,
              userId: userB,
              joinedAt: new Date(),
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
          const messageAttachmentRepo =
            entityManager.getRepository(MessageAttachment);
          const mediaRepo = entityManager.getRepository(Media);
          const message = chatMessageRepo.create({
            chat: { id: data.chatId },
            sender: { id: data.userId },
            text: data.text,
            chatId: data.chatId,
            senderId: data.userId,
            replyToMessageId: data.replyToMessageId,
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
          let attachments: MessageAttachment[] = [];
          if (data.attachments) {
            const messageAttachmentEntities = data?.attachments?.map((m) => {
              // 🔐 ownership validation
              if (
                !m.sourceIdOrKey.startsWith(
                  `${MediaUploadFolder.MESSAGES}/${data.userId}/`,
                )
              ) {
                throw new ForbiddenException(
                  'Invalid media ownership or folder',
                );
              }

              const isCloudinary = m.provider === MediaProvider.CLOUDINARY;

              return mediaRepo.create({
                //post: post.id,
                provider: m.provider,
                type: m.type,
                sourceIdOrKey: m.sourceIdOrKey,
                width: m.width,
                height: m.height,
                duration: m.duration,
                status: isCloudinary
                  ? MediaStatus.READY
                  : MediaStatus.PROCESSING,
                originalUrl: m.originalUrl,
                streamUrl: m.streamUrl,
                size: m.size,
                fileName: m.fileName,
                //  position: index,
              });
            });

            const messageAttachments = messageAttachmentEntities?.map(
              (attachment, index) =>
                messageAttachmentRepo.create({
                  position: index,
                  message,
                  attachment,
                  messageId: message.id,
                }),
            );

            attachments = await messageAttachmentRepo.save(messageAttachments);
          }

          return { ...message, attachments };
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
        .leftJoinAndSelect('chat.lastMessage', 'lastMessage')
        .leftJoinAndSelect('lastMessage.attachments', 'lastMessageAttachments')
        .leftJoinAndSelect(
          'lastMessageAttachments.attachment',
          'lastMessageAttachmentsAttachment',
        )
        // Fall back to the current user's joined_at when there's no
        // lastMessage, or when they joined after the last message was sent.
        // GREATEST in Postgres returns the non-null argument when one side
        // is NULL, so this also keeps brand-new chats at the right position.
        //
        // The expression is exposed via addSelect with a flat alias because
        // TypeORM's split-query pagination path naively does
        // `orderCriteria.split('.')` and tries to resolve the first segment
        // as a join alias — so a raw expression in orderBy breaks. Ordering
        // by the addSelect alias hits a different code branch that prefixes
        // it with the outer distinct-alias for us.
        .addSelect(
          `GREATEST("lastMessage"."created_at", "myParticipant"."joined_at")`,
          'chat_sort_at',
        )
        .orderBy('chat_sort_at', 'DESC');

      if (limit) {
        chatsQuery.skip(skip).take(limit);
      }

      const total = await chatsQuery.getCount();
      const chats = await chatsQuery.getMany();

      // Resolve unread counts in a separate query keyed by chatId. Doing it
      // inline via addSelect + getRawAndEntities is unreliable here because
      // the main query uses pagination with one-to-many joins, so TypeORM
      // splits it into an id query + data query and the raw rows returned to
      // us no longer carry the subquery column (and even without splitting,
      // raw rows are not 1:1 with deduped entities).
      const unreadCountMap = new Map<string, number>();
      if (chats.length > 0) {
        const chatIds = chats.map((c) => c.id);
        const unreadRows = await this.chatMessageRepo
          .createQueryBuilder('message')
          .select('message.chat_id', 'chatId')
          .addSelect('COUNT(message.id)', 'unreadCount')
          .innerJoin(
            'chat_participants',
            'participant',
            'participant.chat_id = message.chat_id AND participant.user_id = :userId',
          )
          .where('message.chat_id IN (:...chatIds)', { chatIds })
          .andWhere('message.sender_id != :userId')
          // Don't count messages sent before this user actually joined.
          .andWhere('message.created_at >= participant.joined_at')
          .andWhere(
            '(participant.last_read_at IS NULL OR message.created_at > participant.last_read_at)',
          )
          .setParameter('userId', userId)
          .groupBy('message.chat_id')
          .getRawMany<{ chatId: string; unreadCount: string }>();

        for (const row of unreadRows) {
          unreadCountMap.set(row.chatId, Number(row.unreadCount));
        }
      }

      const data = chats.map((chat) => ({
        ...chat,
        unreadCount: unreadCountMap.get(chat.id) ?? 0,
      }));

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
        // Pin the query to the caller's chat_participants row. This both
        // enforces membership (a non-participant gets an empty result set
        // instead of relying on the OR-conditions below to filter them out)
        // and gives us joined_at to scope visible history.
        .innerJoin(
          'chat_participants',
          'participant',
          'participant.chat_id = message.chat_id AND participant.user_id = :userId',
          { userId: authUserId },
        )
        .leftJoinAndSelect('message.receipts', 'receipt')
        .leftJoinAndSelect('message.attachments', 'attachments')
        .leftJoinAndSelect('attachments.attachment', 'attachment')
        .where('message.chatId = :chatId', { chatId })
        // Don't surface messages older than the user's current membership.
        // Receipts aren't backfilled when someone is added to a chat, and
        // exitGroupChat deletes the participant row but not their old
        // receipts, so a leave+rejoin would otherwise leak pre-leave history.
        .andWhere('message.created_at >= participant.joined_at')
        .andWhere(
          new Brackets((qb) => {
            qb.where(
              'message.senderId = :userId AND message.deletedForMe = false',
              { userId: authUserId },
            )
              .orWhere(
                'message.senderId = :userId AND message.deleted = true',
                { userId: authUserId },
              )
              .orWhere('receipt.userId = :userId AND receipt.deleted = false', {
                userId: authUserId,
              })
              .orWhere('receipt.userId = :userId AND message.deleted = true', {
                userId: authUserId,
              });
          }),
        )
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

  /**
   * Flip every still-undelivered receipt for `userId` to delivered=true and
   * notify the original senders. Used as a sweep on socket connect (no
   * chatId) and can also be narrowed to a single chat if a caller ever
   * wants per-chat-open semantics.
   */
  async markDelivered(userId: string, chatId?: string) {
    try {
      const qb = this.messageReceiptRepo
        .createQueryBuilder('receipt')
        .innerJoinAndSelect('receipt.message', 'message')
        .where('receipt.user_id = :userId', { userId })
        .andWhere('receipt.delivered = false');

      if (chatId) {
        qb.andWhere('message.chat_id = :chatId', { chatId });
      }

      const receipts = await qb.getMany();
      if (!receipts.length) return;

      const now = new Date();
      await this.messageReceiptRepo
        .createQueryBuilder()
        .update()
        .set({ delivered: true, deliveredAt: now })
        .whereInIds(receipts.map((r) => r.id))
        .execute();

      // Batch notifications: a user reconnecting after a long gap may have
      // hundreds of undelivered receipts. One socket event per message
      // floods the senders' sockets, so we group by (senderId, chatId) and
      // emit a single chat.messages_delivered event per group. The
      // frontend gets enough info to tick every affected message in one
      // pass per chat thread.
      const bySenderAndChat = new Map<string, Map<string, string[]>>();
      for (const r of receipts) {
        const senderId = r.message.senderId;
        const msgChatId = r.message.chatId;
        let byChat = bySenderAndChat.get(senderId);
        if (!byChat) {
          byChat = new Map<string, string[]>();
          bySenderAndChat.set(senderId, byChat);
        }
        let ids = byChat.get(msgChatId);
        if (!ids) {
          ids = [];
          byChat.set(msgChatId, ids);
        }
        ids.push(r.message.id);
      }

      for (const [senderId, byChat] of bySenderAndChat) {
        for (const [groupChatId, messageIds] of byChat) {
          this.wsGateway.emitToUser(senderId, 'chat.messages_delivered', {
            userId,
            chatId: groupChatId,
            messageIds,
            deliveredAt: now,
          });
        }
      }
    } catch (error) {
      throw error;
    }
  }

  async markRead(chatId: string, userId: string) {
    try {
      return await this.dataSource.manager.transaction(
        async (entityManager) => {
          const messageReceiptRepo =
            entityManager.getRepository(MessageReceipt);
          const chatParticipantRepo =
            entityManager.getRepository(ChatParticipant);
          const receipts = await messageReceiptRepo.find({
            where: {
              user: { id: userId },
              read: false,
              message: { chat: { id: chatId } },
            },
            relations: ['message'],
            order: { message: { createdAt: 'DESC' } },
          });

          const now = new Date();
          for (const r of receipts) {
            r.read = true;
            r.readAt = now;
            // Read necessarily implies delivered. If the sweep on socket
            // connect hasn't run yet (or this receipt was created while the
            // user was offline and they're reading via HTTP), make sure
            // we don't leave the receipt in the nonsensical state
            // "read=true, delivered=false".
            if (!r.delivered) {
              r.delivered = true;
              r.deliveredAt = now;
            }
          }
          await chatParticipantRepo.update(
            { chatId, userId },
            {
              lastReadAt: now,
            },
          );
          await messageReceiptRepo.save(receipts);

          // Notify senders in batches: every receipt here belongs to the
          // same chat, so we only need to group by sender to collapse a
          // potentially long read-receipt list into one frame per sender.
          // Mirrors the chat.messages_delivered shape.
          const messageIdsBySender = new Map<string, string[]>();
          for (const r of receipts) {
            const senderId = r.message?.senderId;
            if (!senderId) continue;
            let ids = messageIdsBySender.get(senderId);
            if (!ids) {
              ids = [];
              messageIdsBySender.set(senderId, ids);
            }
            ids.push(r.message.id);
          }

          for (const [senderId, messageIds] of messageIdsBySender) {
            this.wsGateway.emitToUser(senderId, 'chat.messages_read', {
              userId,
              chatId,
              messageIds,
              readAt: now,
            });
          }
        },
      );
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
              joinedAt: new Date(),
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
                  joinedAt: new Date(),
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
            (participant) => participant.userId === userId,
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
            (participant) => participant.userId === userId,
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
          const messageReceiptRepo =
            entityManager.getRepository(MessageReceipt);
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
            (participant) => participant.userId === userId,
          );

          if (!userParticipant) {
            throw new HttpException(
              {
                statusCode: HttpStatus.NOT_FOUND,
                message: 'You are not a member of this chat',
              },
              HttpStatus.NOT_FOUND,
            );
          }

          if (chat.participants.length === 1) {
            //Last person in the chat, you can delete chat if need be
          }

          // Drop this user's receipts for messages in this chat so that a
          // future rejoin doesn't surface stale history and the table
          // doesn't accumulate dead rows. Scoped via a subquery on
          // chat_messages because message_receipts doesn't carry chat_id.
          await messageReceiptRepo
            .createQueryBuilder()
            .delete()
            .where('user_id = :userId', { userId })
            .andWhere(
              'message_id IN (SELECT id FROM chat_messages WHERE chat_id = :chatId)',
              { chatId },
            )
            .execute();

          await chatParticipantRepo.delete({
            userId: userParticipant.userId,
            chatId: userParticipant.chatId,
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
