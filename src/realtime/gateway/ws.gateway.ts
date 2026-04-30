import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Auth } from 'src/common/interfaces/auth.interface';
import { EventBus } from 'src/events/event-bus.service';
import { UseGuards } from '@nestjs/common';
import { WsAuthGuard } from '../guards/ws-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { wsFailure, wsSuccess } from 'src/common/helpers/response.helper';
import { PresenceService } from '../services/presence.service';
import { CreateMessageDto } from 'src/modules/chats/dtos/create-message.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private presenceService: PresenceService,
    private readonly eventBus: EventBus,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers['authorization'];

      if (!token) throw new Error();

      const user: Auth = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_ACCESS_TOKEN_SECRET'),
      });

      socket.data.user = user;

      // 🔥 Global user room
      if (user.id) socket.join(`user:${user.id}`);
      // 🔥 MARK ONLINE
      this.presenceService.userConnected(user.id);

      // notify others (optional)
      // this.emitToUser(user.id, 'presence.status', {
      //   status: 'online',
      // });
      console.log(`Client connected: ${socket.id}, user: ${user.id}`);
    } catch (error) {
      console.log(error);
      // socket.disconnect();
    }
  }
  handleDisconnect(socket: Socket) {
    const user = socket.data.user;

    if (user?.id) {
      this.presenceService.userDisconnected(user.id);

      this.emitToUser(user.id, 'presence.status', {
        status: 'offline',
      });
    }
  }
  emitToRoom(room: string, event: string, payload: any) {
    this.server.to(room).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: any) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('chat.join')
  join(@MessageBody() { chatId }: any, @ConnectedSocket() socket: Socket) {
    socket.join(`chat:${chatId}`);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('chat.send_message')
  send(@MessageBody() payload: CreateMessageDto, @CurrentUser() user: Auth) {
    try {
      console.log(
        {
          ...payload,
          userId: user.id,
        },
        'On send before evemnt bus',
      );
      this.eventBus.emit('chat.send_message', {
        ...payload,
        userId: user.id,
      });
      return wsSuccess('chat.send_message_ack', {
        tempId: payload.tempId, // frontend-generated id
      });
    } catch (error) {
      console.log(error);
      const errorCodeMesssage =
        error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      return wsFailure(
        'chat.send_message_ack',
        'SEND_FAILED',
        errorCodeMesssage,
      );
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('chat.typing')
  typing(
    @MessageBody() { chatId }: any,
    @CurrentUser() user: any,
    @ConnectedSocket() socket: Socket,
  ) {
    socket.to(`chat:${chatId}`).emit('chat.typing', {
      userId: user.id,
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('chat.read')
  read(@MessageBody() payload: { chatId: string }, @CurrentUser() user: Auth) {
    try {
      this.eventBus.emit('chat.read', {
        ...payload,
        userId: user.id,
      });
      return wsSuccess('chat.read_ack', {
        tempId: '', // frontend-generated id
      });
    } catch (error) {
      const errorCodeMesssage =
        error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      return wsFailure('chat.read_ack', 'READ_CHAT_FAILED', errorCodeMesssage);
    }
  }

  //   @UseGuards(WsAuthGuard)
  //   @SubscribeMessage('chat.sync')
  // async sync(@CurrentUser() user: Auth) {
  //   const chats = await this.chatService.getUserChats(user.id);
  // const messages = await this.messageService.getUndeliveredMessages(user.id);

  // this.emitToUser(user.id, 'chat.missed_messages', messages);

  // await this.messageService.markAsDelivered(messages, user.id);

  //   for (const chat of chats) {
  //     const lastSeen = chat.participant.lastSeenMessageId;

  //     const missedMessages = await this.messageRepo.find({
  //       where: {
  //         chat: { id: chat.id },
  //         id: MoreThan(lastSeen),
  //       },
  //       order: { createdAt: 'ASC' },
  //     });

  //     this.wsGateway.emitToUser(user.id, 'chat.missed_messages', {
  //       chatId: chat.id,
  //       messages: missedMessages,
  //     });
  //   }
  // }
}
