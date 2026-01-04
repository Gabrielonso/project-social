import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional } from 'class-validator';

export class PostFilterDto {
  @ApiPropertyOptional({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter/Search from Date',
    example: '2025-01-01',
  })
  @IsOptional()
  startDate: Date;

  @ApiPropertyOptional({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter/Search to Date',
    example: '2025-12-31',
  })
  @IsOptional()
  endDate: Date;

  // @IsOptional()
  // @IsEnum(TransactionType)
  // type: TransactionType;

  // @IsOptional()
  // @IsEnum(TransactionStatus)
  // status: TransactionStatus;

  // @IsOptional()
  // @IsEnum(ServiceTypes)
  // service: ServiceTypes;
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
    description: 'Number of items per page',
    example: 10,
  })
  @IsOptional()
  @IsNumberString()
  limit: number;

  // @IsOptional()
  // @IsString()
  // search?: string;
}
