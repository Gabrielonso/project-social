import { IsArray, IsUUID, ArrayNotEmpty, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddChatMembersDto {
  @ApiProperty({
    description: 'Ids of users',
    example: ['fd9391ab-9f91-45ef-87a6-df076bb19d0c'],
  })
  @ArrayNotEmpty()
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  users: string[];
}
