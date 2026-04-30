import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsUUID } from 'class-validator';

export class ChatMessagesFilterDto {
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

  @ApiPropertyOptional({
    description: 'User ID',
    example: '475f377b-2c73-4dc9-8bf0-ca2581deee92',
  })
  @IsUUID()
  @IsOptional()
  userId: string;

  @ApiPropertyOptional({
    description: 'Chat ID',
    example: '79abc095-9ab0-495e-8b97-2843f7def664',
  })
  @IsUUID()
  @IsOptional()
  chatId: string;
}
