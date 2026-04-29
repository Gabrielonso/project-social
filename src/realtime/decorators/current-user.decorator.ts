import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator((_, ctx: ExecutionContext) => {
  const client = ctx.switchToWs().getClient();
  return client.data.user;
});
