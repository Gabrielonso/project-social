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
import { AuthService } from 'src/modules/auth/auth.service';
import { Auth } from 'src/common/interfaces/auth.interface';
import { EventBus } from 'src/events/event-bus.service';
import { UseGuards } from '@nestjs/common';
import { WsAuthGuard } from '../guards/ws-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

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
    private authService: AuthService,
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
      console.log(user);
      socket.data.user = user;

      // 🔥 Global user room
      if (user.id) socket.join(`user:${user.id}`);
      console.log(`Client connected: ${socket.id}, user: ${user.id}`);
    } catch (error) {
      console.log(error);
      // socket.disconnect();
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

  //   @UseGuards(WsAuthGuard)
  @SubscribeMessage('chat.send_message')
  send(@MessageBody() payload: any, @CurrentUser() user: Auth) {
    this.eventBus.emit('chat.send_message', {
      ...payload,
      userId: user.id,
    });
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
}
