import { IsUUID, IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TagType } from '../enums/tag-type.enum';

export class TagDto {
  @ApiProperty({
    description: 'User being tagged or mentioned',
    example: 'uuid-of-user',
  })
  @IsUUID()
  userId: string;

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
