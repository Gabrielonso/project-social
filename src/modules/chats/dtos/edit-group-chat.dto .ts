import { IsOptional, IsString, IsArray, IsUUID, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EditGroupChatDto {
  @ApiPropertyOptional({
    description: 'Name of group chat',
    example: 'Football fans banter',
  })
  @IsString()
  @IsOptional()
  name: string;

  @ApiPropertyOptional({
    description: 'About group chat',
    example: 'Uniting football fans together',
  })
  @IsString()
  @IsOptional()
  about: string;

  @ApiPropertyOptional({
    description: `Photo of group chat`,
    example: 'https://...jpg',
  })
  @IsUrl()
  @IsString()
  @IsOptional()
  photo: string;
}
