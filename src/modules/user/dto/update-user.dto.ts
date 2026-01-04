import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserStatusEnum } from '../interfaces/user.interfaces';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName: string;
}

export class UpdateUserStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(Object.values(UserStatusEnum))
  status: UserStatusEnum;
}
