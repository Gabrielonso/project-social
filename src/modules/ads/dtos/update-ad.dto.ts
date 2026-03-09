import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class UpdateAdDto {
  @ApiPropertyOptional({
    description: 'Topic of Ad',
    example: 'Updated campaign topic',
  })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional({
    description: 'Description/content of Ad',
    example: 'Updated description...',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description:
      'Hashtags for the ad (max 5). Use without the leading # (recommended).',
    example: ['sale', 'newarrival'],
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

