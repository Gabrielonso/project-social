import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email address of the user',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: `OTP sent to the user's email`,
    example: '234138',
  })
  @IsString()
  @IsNotEmpty()
  otp: string;
}

export class ResendEmailOtpDto {
  @ApiProperty({
    description: 'Email address of the user',
    example: 'john.doe@example.com',
  })
  @IsString()
  @IsNotEmpty()
  email: string;
}
