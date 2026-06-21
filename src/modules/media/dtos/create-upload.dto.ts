import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MediaType } from '../enums/media-type.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaUploadFolder } from '../enums/media-upload-folder.enum';

export class CreateUploadDto {
  @ApiProperty({
    description: 'Type of Media file',
    example: MediaType.IMAGE,
    enum: MediaType,
  })
  @IsEnum(MediaType)
  @IsNotEmpty()
  type: MediaType;

  @ApiProperty({
    description: 'Mime Type of media file',
    example: 'video/mp4',
    type: 'string',
  })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({
    description: 'Size of media file in Bytes',
    example: 10000,
    type: 'integer',
  })
  @IsInt()
  @Max(100_000_000) // 100MB
  @IsNotEmpty()
  size: number;

  @ApiProperty({
    description: 'Parent folder to upload file',
    example: MediaUploadFolder.POSTS,
    enum: MediaUploadFolder,
  })
  @IsEnum(MediaUploadFolder)
  @IsNotEmpty()
  uploadFolder: MediaUploadFolder;

  @ApiPropertyOptional({
    description: 'Original file width in pixels (from client-side probe)',
    example: 1920,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @ApiPropertyOptional({
    description: 'Original file height in pixels (from client-side probe)',
    example: 1080,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;

  @ApiPropertyOptional({
    description: 'Media duration in milliseconds (video/audio)',
    example: 15000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Original file name from the device',
    example: 'IMG_4521.mp4',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;
}
