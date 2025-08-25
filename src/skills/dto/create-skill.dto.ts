import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSkillDto {
  @ApiProperty({
    description: 'Name of skill',
    example: 'Video Editing',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
