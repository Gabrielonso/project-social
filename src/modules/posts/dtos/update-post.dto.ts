import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class UpdatePostDto {
  @ApiPropertyOptional({
    description: 'Caption/content of post',
    example: 'Updated caption...',
  })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiPropertyOptional({
    description:
      'Hashtags for the post (max 5). Use without the leading # (recommended).',
    example: ['music', 'travel', 'weekend'],
    type: [String],
    maxItems: 5,
  })
  @IsArray()
  @ArrayMaxSize(5)
  @IsOptional()
  @IsString({ each: true })
  @Length(1, 50, { each: true })
  @Matches(/^[a-zA-Z0-9_#]+$/, { each: true })
  hashtags?: string[];
}

