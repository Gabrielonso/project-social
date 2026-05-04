import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGroupChatDto {
  @ApiProperty({
    description: 'Name of group chat',
    example: 'Football fans banter',
  })
  @IsString()
  @IsNotEmpty()
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

  @ApiPropertyOptional({
    description: 'Ids of users',
    example: ['fd9391ab-9f91-45ef-87a6-df076bb19d0c'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  users: string[];
}
