import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumberString, IsOptional } from 'class-validator';

export class SoundFilterDto {
  @ApiPropertyOptional({
    required: false,
    type: String,
    description: 'Filter usage from this date (inclusive)',
    example: '2025-01-01',
  })
  @IsDateString()
  @IsOptional()
  startDate: Date;

  @ApiPropertyOptional({
    required: false,
    type: String,
    description: 'Filter usage to this date (inclusive)',
    example: '2025-12-31',
  })
  @IsDateString()
  @IsOptional()
  endDate: Date;

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
    description: 'Number of items per page / limit',
    example: 20,
  })
  @IsOptional()
  @IsNumberString()
  limit: number;
}

