import {
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MediaDto } from 'src/modules/media/dtos/media.dto';

export class CreateMessageDto {
  @ApiPropertyOptional({
    description: 'Chat ID where this message belongs to',
    example: 'uuid',
  })
  @IsOptional()
  chatId?: string;

  @ApiPropertyOptional({
    description: 'Pre-uploaded attachment media IDs (S3 mediaId flow)',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  attachmentMediaIds?: string[];

  // @ApiPropertyOptional({
  //   description: 'Media files data (legacy Cloudinary flow)',
  //   type: [MediaDto],
  // })
  // @IsArray()
  // @ValidateNested({ each: true })
  // @Type(() => MediaDto)
  // @IsOptional()
  // attachments?: MediaDto[];

  @ApiPropertyOptional({
    description: 'Text message',
    example: 'Hello dear, \nHow are you?',
  })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiPropertyOptional({
    description: 'Sender user ID',
    example: 'fd9391ab-9f91-45ef-87a6-df076bb19d0c',
  })
  @IsUUID()
  @IsOptional()
  userId: string;

  @ApiPropertyOptional({
    description: 'Receiver user ID',
    example: 'fd9391ab-9f91-45ef-87a6-df076bb19d0c',
  })
  @IsUUID()
  @IsOptional()
  receiverUserId: string;

  @ApiPropertyOptional({
    description: 'Randomly generated string',
    example: 'string',
  })
  @IsOptional()
  tempId?: string;

  @ApiPropertyOptional({
    description: 'Message ID being replied to',
    example: 'fd9391ab-9f91-45ef-87a6-df076bb19d0c',
  })
  @IsUUID()
  @IsOptional()
  replyToMessageId: string;
}
