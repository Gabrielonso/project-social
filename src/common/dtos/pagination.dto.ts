import { Transform } from 'class-transformer';
import { IsOptional, IsPositive } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TransformNumberStringToNumber } from '../utils/transformers.util';

// Extend this class in any class that needs it
export class PaginationDto {
  constructor(dto: Omit<PaginationDto, 'getSkip'>) {
    Object.assign(this, dto);
  }

  @ApiPropertyOptional({
    type: String,
    example: '1',
  })
  @IsPositive()
  @Transform(TransformNumberStringToNumber)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({
    type: String,
    example: '10',
  })
  @IsPositive()
  @Transform(TransformNumberStringToNumber)
  @IsOptional()
  limit: number = 10;

  getSkip(): number {
    return (this.page - 1) * this.limit;
  }
}
