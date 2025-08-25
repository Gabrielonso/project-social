import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}
