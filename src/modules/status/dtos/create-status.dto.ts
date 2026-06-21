import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { MediaDto } from 'src/modules/media/dtos/media.dto';

export class CreateStatusDto {
  @ApiPropertyOptional({
    description: 'Text content for the status (future: thought status)',
    example: 'Busy day, grateful.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  content?: string;

  @ApiPropertyOptional({
    description: 'Pre-uploaded media ID (S3 mediaId flow)',
    example: 'uuid',
  })
  @IsOptional()
  @IsUUID('4')
  mediaId?: string;

  // @ApiPropertyOptional({
  //   description: 'Status media (legacy Cloudinary flow).',
  //   type: MediaDto,
  // })
  // @IsOptional()
  // @ValidateNested()
  // @Type(() => MediaDto)
  // media?: MediaDto;
}
