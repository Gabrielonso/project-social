import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional } from 'class-validator';

export class TrendQueryDto {
  @ApiPropertyOptional({
    required: false,
    type: Number,
    description: 'Page number for pagination',
    example: 1,
  })
  @IsOptional()
  @IsNumberString()
  page: number;

  @ApiPropertyOptional({
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 20,
  })
  @IsOptional()
  @IsNumberString()
  limit: number;
}

