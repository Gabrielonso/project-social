import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import { MediaProvider } from '../enums/media-provider.enum';
import { MediaType } from '../enums/media-type.enum';

export class MediaDto {
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

  @ApiPropertyOptional({
    description: 'File name',
    example: 'photo.jpg',
  })
  @IsString()
  @IsOptional()
  fileName: string;
}
