import { TransformToLowercase } from 'src/common/utils/transformers.util';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class SignupUserDto {
  @ApiProperty({ description: 'First name of the user', example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'Last name of the user', example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'Email address of the user',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  @Transform(TransformToLowercase)
  email: string;

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
  password: string;

  // @ApiPropertyOptional({ description: 'Optional tenant ID', example: 'abc-123-xyz' })
}
