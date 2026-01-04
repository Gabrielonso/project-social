import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DeleteUserAccountDto {
  @IsNotEmpty()
  @IsString()
  reason: string;
}
