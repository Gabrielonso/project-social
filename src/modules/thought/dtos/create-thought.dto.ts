import { IsNotEmpty, IsOptional, IsBoolean, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateThoughtDto {
  @ApiPropertyOptional({
    description: 'Title of thought',
    example: 'The Creation Story',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: 'Content of thought',
    example: 'In the beginning God created the heavens and the earth',
  })
  @IsString()
  @IsNotEmpty()
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
