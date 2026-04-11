import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateThoughtDto {
  @ApiPropertyOptional({
    description: 'Title of thought',
    example: 'The Creation Story',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Content of thought',
    example: 'In the beginning God created the heavens and the earth',
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    description: 'Make Post Public',
    example: true,
    type: 'boolean',
  })
  @IsBoolean()
  @IsOptional()
  isPublic: boolean;
}
