import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EditMessageDto {
  @ApiProperty({
    description: 'Text message',
    example: 'Hello dear, \nHow are you?',
  })
  @IsString()
  @IsNotEmpty()
  text?: string;

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
