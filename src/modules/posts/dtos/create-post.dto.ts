import {
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
  IsEnum,
  IsNumber,
  Min,
  ArrayMaxSize,
  Matches,
  Length,
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
  @IsString()
  @IsNotEmpty()
  originalUrl: string;

  @ApiPropertyOptional({
    example: 'https://...sp_auto...m3u8',
    description: 'HTTP Live Streaming URL',
  })
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

class SoundMediaDto {
  @ApiProperty({
    description: `Media file's original URL`,
    example: 'https://...mp3',
  })
  @IsString()
  @IsNotEmpty()
  originalUrl: string;

  @ApiPropertyOptional({
    example: 'https://...sp_auto...m3u8',
    description: 'HTTP Live Streaming URL',
  })
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
    example: MediaType.AUDIO,
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
    description: 'Size of media file in bytes',
    example: 91641,
    type: 'number',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  size: number;
}

export class CreatePostDto {
  @ApiProperty({
    description: 'Caption of post',
    example:
      'Global Talent Hunt 2.0 is an exciting opportunity that allows talents from all over the world to have access to everything... blah blah blah',
  })
  @IsOptional()
  caption?: string;

  @ApiPropertyOptional({
    description:
      'Hashtags for the post (max 5). Use without the leading # (recommended).',
    example: ['music', 'travel', 'weekend'],
    type: [String],
    maxItems: 5,
  })
  @IsArray()
  @ArrayMaxSize(5)
  @IsOptional()
  @IsString({ each: true })
  @Length(1, 50, { each: true })
  @Matches(/^[a-zA-Z0-9_#]+$/, { each: true })
  hashtags?: string[];

  @ApiPropertyOptional({
    description: 'Sound media for the post (audio only).',
    type: SoundMediaDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SoundMediaDto)
  sound?: SoundMediaDto;

  @ApiProperty({
    description: 'Media files data',
    type: [MediaDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaDto)
  media: MediaDto[];
}
