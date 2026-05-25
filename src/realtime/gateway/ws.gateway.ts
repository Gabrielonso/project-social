import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  Ack,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Auth } from 'src/common/interfaces/auth.interface';
import { EventBus } from 'src/events/event-bus.service';
import { Inject, UseGuards, forwardRef } from '@nestjs/common';
import { CallService } from 'src/modules/calls/services/call.service';
import { InitiateCallDto } from 'src/modules/calls/dto/initiate-call.dto';
import { AcceptCallDto } from 'src/modules/calls/dto/accept-call.dto';
import { RejectCallDto } from 'src/modules/calls/dto/reject-call.dto';
import { EndCallDto } from 'src/modules/calls/dto/end-call.dto';
import { WsAuthGuard } from '../guards/ws-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { wsFailure, wsSuccess } from 'src/common/helpers/response.helper';
import { PresenceService } from '../services/presence.service';
import { CreateMessageDto } from 'src/modules/chats/dtos/create-message.dto';
import { EditMessageDto } from 'src/modules/chats/dtos/edit-message.dto';
import { DeleteMessageDto } from 'src/modules/chats/dtos/delete-message.dto';
import { DeleteMessageMode } from 'src/modules/chats/enums/message.enum';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private presenceService: PresenceService,
    private readonly eventBus: EventBus,
    @Inject(forwardRef(() => CallService))
    private readonly callService: CallService,
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
      await this.presenceService.userConnected(user.id);

      // 🔥 Fan-out: let chat (and anything else) sweep per-user state now
      // that the user is reachable again. Emitted AFTER presence is set so
      // any race with an inbound message decides "online" at send time.
      if (user.id) {
        this.eventBus.emit('chat.user_connected', { userId: user.id });
        void this.callService.onUserConnected(user.id).catch(() => undefined);
      }

      // notify others (optional)
      // this.emitToUser(user.id, 'presence.status', {
      //   status: 'online',
      // });
      console.log(`Client connected: ${socket.id}, user: ${user.id}`);
    } catch (error) {
      console.log(error);
      socket.disconnect();
    }
  }
  handleDisconnect(socket: Socket) {
    const user = socket.data.user;

    if (user?.id) {
      void this.presenceService.userDisconnected(user.id);

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

  /** Keeps Redis presence in sync while the socket stays open (extends TTL). */
  private touchPresence(userId: string | undefined) {
    if (!userId) return;
    void this.presenceService.refreshPresence(userId);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('chat.join')
  join(@MessageBody() { chatId }: any, @ConnectedSocket() socket: Socket) {
    this.touchPresence(socket.data.user?.id);
    socket.join(`chat:${chatId}`);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('chat.send_message')
  send(
    @MessageBody() payload: CreateMessageDto,
    @CurrentUser() user: Auth,
    @Ack() ack: (response: any) => void,
  ) {
    try {
      this.touchPresence(user.id);
      this.eventBus.emit('chat.send_message', {
        ...payload,
        userId: user.id,
      });
      ack(
        wsSuccess('chat.send_message_ack', {
          tempId: payload.tempId, // frontend-generated id
        }),
      );
    } catch (error) {
      const errorCodeMesssage =
        error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      ack(wsFailure('chat.send_message_ack', 'SEND_FAILED', errorCodeMesssage));
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('chat.edit_message')
  editMessage(
    @MessageBody() payload: EditMessageDto,
    @CurrentUser() user: Auth,
    @Ack() ack: (response: any) => void,
  ) {
    try {
      this.touchPresence(user.id);
      if (!payload.messageId || !payload.text) {
        return ack(
          wsFailure(
            'chat.edit_message_ack',
            'EDIT_FAILED',
            'Invalid message/text input',
          ),
        );
      }
      this.eventBus.emit('chat.edit_message', {
        ...payload,
        userId: user.id,
      });

      ack(
        wsSuccess('chat.edit_message_ack', {
          messageId: payload.messageId,
        }),
      );
    } catch (error) {
      const errorCodeMesssage =
        error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      ack(wsFailure('chat.edit_message_ack', 'EDIT_FAILED', errorCodeMesssage));
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('chat.delete_message')
  deleteMessage(
    @MessageBody()
    payload: DeleteMessageDto,
    @CurrentUser() user: Auth,
    @Ack() ack: (response: any) => void,
  ) {
    try {
      this.touchPresence(user.id);
      if (!payload.messageId || !payload.mode) {
        return ack(
          wsFailure(
            'chat.delete_message_ack',
            'DELETE_FAILED',
            'Invalid message / delete mode',
          ),
        );
      }
      if (
        ![DeleteMessageMode.EVERYONE, DeleteMessageMode.ME].includes(
          payload.mode,
        )
      ) {
        return ack(
          wsFailure(
            'chat.delete_message_ack',
            'DELETE_FAILED',
            'Delete mode must be either for me or for everyone',
          ),
        );
      }
      this.eventBus.emit('chat.delete_message', {
        ...payload,
        userId: user.id,
      });

      ack(
        wsSuccess('chat.delete_message_ack', {
          messageId: payload.messageId,
        }),
      );
    } catch (error) {
      const errorCodeMesssage =
        error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      ack(
        wsFailure(
          'chat.delete_message_ack',
          'DELETE_FAILED',
          errorCodeMesssage,
        ),
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
    this.touchPresence(user.id);
    socket.to(`chat:${chatId}`).emit('chat.typing', {
      userId: user.id,
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('chat.read')
  read(
    @MessageBody() payload: { chatId: string },
    @CurrentUser() user: Auth,
    @Ack() ack: (response: any) => void,
  ) {
    try {
      this.touchPresence(user.id);
      this.eventBus.emit('chat.read', {
        ...payload,
        userId: user.id,
      });
      ack(
        wsSuccess('chat.read_ack', {
          tempId: '', // frontend-generated id
        }),
      );
    } catch (error) {
      const errorCodeMesssage =
        error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      ack(wsFailure('chat.read_ack', 'READ_CHAT_FAILED', errorCodeMesssage));
    }
  }

  /**
   * Client should emit when the app is backgrounded or the user is idle
   * but the socket remains connected (e.g. AppState "background").
   */
  @UseGuards(WsAuthGuard)
  @SubscribeMessage('presence.away')
  async setPresenceAway(
    @CurrentUser() user: Auth,
    @Ack() ack: (response: any) => void,
  ) {
    try {
      await this.presenceService.markAway(user.id);
      this.emitToUser(user.id, 'presence.status', { status: 'away' });
      ack(wsSuccess('presence.away_ack', { status: 'away' }));
    } catch (error) {
      const errorCodeMesssage =
        error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      ack(wsFailure('presence.away_ack', 'AWAY_FAILED', errorCodeMesssage));
    }
  }

  /**
   * Client should emit when returning to the foreground after presence.away.
   * Refreshes online TTL and runs the undelivered-message delivery sweep.
   */
  @UseGuards(WsAuthGuard)
  @SubscribeMessage('presence.active')
  async setPresenceActive(
    @CurrentUser() user: Auth,
    @Ack() ack: (response: any) => void,
  ) {
    try {
      await this.presenceService.userConnected(user.id);
      this.eventBus.emit('chat.user_connected', { userId: user.id });
      this.emitToUser(user.id, 'presence.status', { status: 'online' });
      ack(wsSuccess('presence.active_ack', { status: 'online' }));
    } catch (error) {
      const errorCodeMesssage =
        error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      ack(wsFailure('presence.active_ack', 'ACTIVE_FAILED', errorCodeMesssage));
    }
  }

  /**
   * Optional explicit ping (e.g. every 45–60s while foreground).
   * Any chat/presence event also refreshes TTL via touchPresence.
   */
  @UseGuards(WsAuthGuard)
  @SubscribeMessage('presence.heartbeat')
  async presenceHeartbeat(
    @CurrentUser() user: Auth,
    @Ack() ack: (response: any) => void,
  ) {
    try {
      const status = await this.presenceService.refreshPresence(user.id);
      ack(wsSuccess('presence.heartbeat_ack', { status }));
    } catch (error) {
      const errorCodeMesssage =
        error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      ack(
        wsFailure(
          'presence.heartbeat_ack',
          'HEARTBEAT_FAILED',
          errorCodeMesssage,
        ),
      );
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

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('call.initiate')
  callInitiate(
    @MessageBody() payload: InitiateCallDto,
    @CurrentUser() user: Auth,
  ) {
    this.touchPresence(user.id);
    void this.callService.initiate(user.id, payload);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('call.accept')
  callAccept(@MessageBody() payload: AcceptCallDto, @CurrentUser() user: Auth) {
    this.touchPresence(user.id);
    void this.callService.accept(user.id, payload);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('call.reject')
  callReject(@MessageBody() payload: RejectCallDto, @CurrentUser() user: Auth) {
    this.touchPresence(user.id);
    void this.callService.reject(user.id, payload.uuid);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('call.end')
  callEnd(@MessageBody() payload: EndCallDto, @CurrentUser() user: Auth) {
    this.touchPresence(user.id);
    void this.callService.end(user.id, payload);
  }
}
