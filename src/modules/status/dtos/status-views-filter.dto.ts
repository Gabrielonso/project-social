import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional } from 'class-validator';

export class StatusViewsFilterDto {
  @ApiPropertyOptional({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
    example: 1,
  })
  @IsOptional()
  @IsNumberString()
  page: number;

  @ApiPropertyOptional({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of viewers per page',
    example: 20,
  })
  @IsOptional()
  @IsNumberString()
  limit: number;
}
