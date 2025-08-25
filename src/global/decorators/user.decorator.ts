import { Request } from 'express';

import { ExecutionContext, createParamDecorator } from '@nestjs/common';

import { User } from 'src/user/entity/user.entity';
import { ICurrentUser } from '@global/interfaces/current-user.interface';

export interface CustomRequest extends Request {
  user: User;
}

export const CurrentUser = createParamDecorator(
  (field: keyof User, ctx: ExecutionContext) => {
    const request: CustomRequest = ctx.switchToHttp().getRequest();
    return field ? request.user[field] : request.user;
  },
);

export const CurrentUserId = createParamDecorator(
  (_field: keyof ICurrentUser, ctx: ExecutionContext) => {
    const request: CustomRequest = ctx.switchToHttp().getRequest();
    const userId = request.user.id;

    return userId;
  },
);
