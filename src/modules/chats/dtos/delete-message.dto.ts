import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeleteMessageMode } from '../enums/message.enum';

export class DeleteMessageDto {
  @ApiProperty({
    description: 'Who do you want to delete the message for?',
    example: DeleteMessageMode.EVERYONE,
  })
  @IsEnum(DeleteMessageMode)
  @IsNotEmpty()
  mode: DeleteMessageMode;

  @ApiProperty({
    description: 'Message ID',
    example: 'fd9391ab-9f91-45ef-87a6-df076bb19d0c',
  })
  @IsUUID()
  @IsNotEmpty()
  messageId: string;

  @ApiPropertyOptional({
    description: 'Sender user ID',
    example: 'fd9391ab-9f91-45ef-87a6-df076bb19d0c',
  })
  @IsUUID()
  @IsOptional()
  userId: string;
}
