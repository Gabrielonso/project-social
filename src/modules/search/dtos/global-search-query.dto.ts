import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { SearchTypeEnum } from '../enums/search-type.enum';

export class GlobalSearchQueryDto {
  @ApiProperty({
    description: 'Search query (min 2 characters)',
    example: 'badboy',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  q: string;

  @ApiPropertyOptional({
    enum: SearchTypeEnum,
    default: SearchTypeEnum.ALL,
    description: 'Filter results by type',
  })
  @IsOptional()
  @IsEnum(SearchTypeEnum)
  types?: SearchTypeEnum = SearchTypeEnum.ALL;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
