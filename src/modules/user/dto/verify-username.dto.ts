import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class VerifyUsernameDto {
  @ApiProperty({
    description:
      'Username to verify. Allowed characters: letters, numbers, underscore. 3–30 characters.',
    minLength: 3,
    maxLength: 30,
    example: 'john_doe',
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message:
      'Username can only contain letters, numbers, and underscores',
  })
  username: string;
}

