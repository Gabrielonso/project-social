import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  IsString,
  IsUrl,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TagType } from '../enums/tag-type.enum';

export class TagDto {
  @ApiProperty({
    description: 'User being tagged or mentioned',
    example: 'uuid-of-user',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Username of user being tagged or mentioned',
    example: 'grace22',
  })
  @IsString()
  username: string;

  @ApiPropertyOptional({
    description: `Avatar of user being tagged/mentioned`,
    example: 'https://...jpg',
  })
  @IsUrl()
  @IsString()
  @IsOptional()
  userAvatar: string;

  @ApiProperty({
    description: 'Type of tag',
    enum: TagType,
    example: TagType.MENTION,
  })
  @IsEnum(TagType)
  type: TagType;

  @ApiPropertyOptional({
    description: 'Start index in caption (required for mentions)',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  startIndex?: number;

  @ApiPropertyOptional({
    description: 'End index in caption (required for mentions)',
    example: 18,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  endIndex?: number;
}
