import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { CallType } from '../enums/call-type.enum';
import { CallSessionStatus } from '../enums/call-session-status.enum';
import { CallDirection } from '../enums/call-direction.enum';

export class CallHistoryFilterDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 50 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Search by other participant username or call UUID',
    example: 'jane',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({ enum: CallType })
  @IsOptional()
  @IsEnum(CallType)
  type?: CallType;

  @ApiPropertyOptional({ enum: CallSessionStatus })
  @IsOptional()
  @IsEnum(CallSessionStatus)
  status?: CallSessionStatus;

  @ApiPropertyOptional({
    enum: CallDirection,
    description: 'incoming = you were callee, outgoing = you were caller',
  })
  @IsOptional()
  @IsEnum(CallDirection)
  direction?: CallDirection;

  @ApiPropertyOptional({ description: 'Filter calls in a specific chat' })
  @IsOptional()
  @IsUUID()
  chatId?: string;

  @ApiPropertyOptional({
    description: 'Filter calls with a specific user (1:1 participant)',
  })
  @IsOptional()
  @IsUUID()
  participantId?: string;

  @ApiPropertyOptional({
    description: 'Calls initiated on or after (ISO 8601)',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Calls initiated on or before (ISO 8601)',
    example: '2026-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Include ringing and in-progress calls (default: history only)',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  includeActive?: boolean;
}
