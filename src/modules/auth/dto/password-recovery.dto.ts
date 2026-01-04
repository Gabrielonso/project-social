import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { TransformToLowercase } from 'src/common/utils/transformers.util';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email address of the user',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  @Transform(TransformToLowercase)
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Email address of the user',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  @Transform(TransformToLowercase)
  email: string;

  @ApiProperty({
    description: "OTP sent to user's email",
    example: '875678',
  })
  @IsString()
  @IsNotEmpty()
  resetOtp: string;

  @ApiProperty({
    description: 'Password for the user',
    example: 'SecurePassword@123!',
  })
  @MinLength(8)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'password should contain at least an uppercase, a lowercase and a special character',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Password for the user',
    example: 'SecurePassword@123!',
  })
  @MinLength(8)
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({
    description: 'Password for the user',
    example: 'SecurePassword@123!',
  })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'password should contain at least an uppercase, a lowercase and a special character',
  })
  @MinLength(8)
  @IsString()
  @IsNotEmpty()
  newPassword: string;
}
