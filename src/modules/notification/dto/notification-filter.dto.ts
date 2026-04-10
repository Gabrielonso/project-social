import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class NotificationQueryFilterDto {
  @ApiPropertyOptional({
    required: false,
    type: Number,
    description: 'Page number for pagination',
    example: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 10,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    required: false,
    type: Boolean,
    description: 'Get read or unread notifications',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  read?: boolean;
}
