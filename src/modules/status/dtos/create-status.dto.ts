import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

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
    description: 'Attach an existing media (by id)',
    example: 'b2a77d36-3b6a-4a06-99d6-7e199bb0d4de',
  })
  @IsOptional()
  @IsUUID()
  mediaId?: string;
}
