import { IsEnum, IsInt, IsNotEmpty, IsString, Max } from 'class-validator';
import { MediaType } from '../enums/media-type.enum';
import { ApiProperty } from '@nestjs/swagger';
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
}
