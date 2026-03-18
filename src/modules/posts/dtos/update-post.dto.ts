import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import { TagDto } from 'src/modules/engagements/dtos/tag.dto';

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

  @ApiPropertyOptional({
    description: 'Allow Comments for this post',
    example: true,
    type: 'boolean',
  })
  @IsBoolean()
  @IsOptional()
  allowComments: boolean;

  @ApiPropertyOptional({
    description: 'Make Post Public',
    example: true,
    type: 'boolean',
  })
  @IsBoolean()
  @IsOptional()
  isPublic: boolean;

  @ApiPropertyOptional({
    description: 'Post location',
    example: 'Trademore estate, Lugbe, Abuja',
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({
    description: 'Users tagged or mentioned in the post',
    type: [TagDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TagDto)
  @IsOptional()
  tags?: TagDto[];
}
