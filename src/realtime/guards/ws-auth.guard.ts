import { CanActivate, ExecutionContext } from '@nestjs/common';

export class WsAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient();
    return !!client.data.user;
  }
}
