import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
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
    description: 'Status media.',
    type: MediaDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MediaDto)
  media?: MediaDto;
}
