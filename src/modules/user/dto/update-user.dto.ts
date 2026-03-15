import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
} from 'class-validator';
import { UserStatusEnum } from '../interfaces/user.interfaces';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'First name of the user' })
  @IsString()
  @IsOptional()
  firstName: string;

  @ApiPropertyOptional({ description: 'Last name of the user' })
  @IsString()
  @IsOptional()
  lastName: string;

  @ApiPropertyOptional({
    description:
      'Unique username. Allowed characters: letters, numbers, underscore. 3–30 characters.',
    minLength: 3,
    maxLength: 30,
  })
  @IsString()
  @IsOptional()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  username: string;

  @ApiPropertyOptional({
    description: 'Short biography or about text for the user',
  })
  @IsString()
  @IsOptional()
  bio: string;

  @ApiPropertyOptional({
    description: 'ISO 3166-1 alpha-2 or alpha-3 country code',
    minLength: 2,
    maxLength: 3,
    example: 'US',
  })
  @IsString()
  @IsOptional()
  @Length(2, 3)
  countryCode: string;

  @ApiPropertyOptional({
    description: 'User profile picture url',
    example: 'https://...jpg',
  })
  @IsUrl()
  @IsString()
  @IsOptional()
  profilePictureUrl: string;

  @ApiPropertyOptional({
    description: 'User date of birth',
    example: '1999-10-24',
  })
  @IsString()
  @Length(10)
  //@IsDateString()
  @IsOptional()
  dob: Date;
}

export class UpdateUserStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(Object.values(UserStatusEnum))
  status: UserStatusEnum;
}
