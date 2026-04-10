import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumberString, IsOptional } from 'class-validator';

export class FeedFilterDto {
  @ApiPropertyOptional({
    required: false,
    type: String,
    description: 'Filter/Search from Date',
    example: '2025-01-01',
  })
  @IsDateString()
  @IsOptional()
  startDate: Date;

  @ApiPropertyOptional({
    required: false,
    type: String,
    description: 'Filter/Search to Date',
    example: '2026-12-31',
  })
  @IsDateString()
  @IsOptional()
  endDate: Date;

  // @ApiPropertyOptional({
  //   required: false,
  //   type: String,
  //   description: 'country of ads',
  //   example: 'NG',
  // })
  // @IsString()
  // @IsOptional()
  // country: string;

  // @ApiPropertyOptional({
  //   required: false,
  //   type: String,
  //   description: 'gender',
  //   example: Gender.MALE,
  //   enum: Gender,
  // })
  // @IsString()
  // @IsOptional()
  // gender?: Gender;

  // @ApiPropertyOptional({
  //   required: false,
  //   type: Number,
  //   description: 'age',
  //   example: 28,
  // })
  // @IsNumberString()
  // @IsOptional()
  // age?: number;

  // @ApiPropertyOptional({
  //   required: false,
  //   type: String,
  //   description: 'What type of feed',
  //   enum: FeedType,
  // })
  // @IsEnum(FeedType)
  // @IsOptional()
  // type: FeedType;

  // @IsOptional()
  // @IsEnum(TransactionStatus)
  // status: TransactionStatus;

  // @IsOptional()
  // @IsEnum(ServiceTypes)
  // service: ServiceTypes;
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
    example: 10,
  })
  @IsOptional()
  @IsNumberString()
  limit: number;

  // @IsOptional()
  // @IsString()
  // search?: string;
}
