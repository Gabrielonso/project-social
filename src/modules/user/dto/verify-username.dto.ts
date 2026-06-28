import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { TransformUsernameToLowercase } from 'src/common/utils/transformers.util';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class VerifyUsernameDto {
  @ApiProperty({
    description:
      'Username to verify. Stored in lowercase. Allowed characters: letters, numbers, underscore. 3–30 characters.',
    minLength: 3,
    maxLength: 30,
    example: 'john_doe',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(TransformUsernameToLowercase)
  @Length(3, 30)
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'Username can only contain letters, numbers, and underscores',
  })
  username: string;
}

