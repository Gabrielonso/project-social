import {
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
  IsEnum,
  IsNumber,
  Min,
  IsUrl,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaProvider } from 'src/modules/media/enums/media-provider.enum';
import { MediaType } from 'src/modules/media/enums/media-type.enum';

class MediaDto {
  @ApiProperty({
    description: `Media file's original URL`,
    example: 'https://...mp4',
  })
  @IsUrl()
  @IsString()
  @IsNotEmpty()
  originalUrl: string;

  @ApiPropertyOptional({
    example: 'https://...sp_auto...m3u8',
    description: 'HTTP Live Streaming URL',
  })
  @IsUrl()
  @IsString()
  @IsOptional()
  streamUrl: string;

  @ApiProperty({
    description: 'Media provider',
    example: MediaProvider.CLOUDINARY,
    enum: MediaProvider,
  })
  @IsEnum(MediaProvider)
  @IsNotEmpty()
  provider: MediaProvider;

  @ApiProperty({
    description: 'Source provider key or public ID',
  })
  @IsString()
  @IsNotEmpty()
  sourceIdOrKey: string;

  @ApiProperty({
    description: 'Media Type',
    example: MediaType.IMAGE,
    enum: MediaType,
  })
  @IsEnum(MediaType)
  @IsNotEmpty()
  type: MediaType;

  @ApiPropertyOptional({
    description: 'How long is the media file in milliseconds',
    example: '1000000',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({
    description: 'What is the width of the media file',
    example: 1365,
    type: 'number',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  width: number;

  @ApiPropertyOptional({
    description: 'What is the height of the media file',
    example: 768,
    type: 'number',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  height: number;

  @ApiPropertyOptional({
    description: 'Size of media file in bytes',
    example: 91641,
    type: 'number',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  size: number;
}

export class CreateMessageDto {
  @ApiProperty({
    description: 'Chat ID where this message belongs to',
    example: 'uuid',
  })
  @IsOptional()
  chatId?: string;

  @ApiPropertyOptional({
    description: 'Media files data',
    type: [MediaDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaDto)
  @IsOptional()
  media: MediaDto[];

  @ApiPropertyOptional({
    description: 'Text message',
    example: 'Hello dear, \nHow are you?',
  })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiProperty({
    description: 'Sender user ID',
    example: 'fd9391ab-9f91-45ef-87a6-df076bb19d0c',
  })
  @IsUUID()
  @IsOptional()
  userId: string;

  @ApiProperty({
    description: 'Receiver user ID',
    example: 'fd9391ab-9f91-45ef-87a6-df076bb19d0c',
  })
  @IsUUID()
  @IsOptional()
  receiverUserId: string;

  @ApiProperty({
    description: 'Randomly generated string',
    example: 'string',
  })
  @IsOptional()
  tempId?: string;
}
