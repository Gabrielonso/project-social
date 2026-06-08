import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class ToggleRepostDto {
  @ApiProperty({
    description: 'ID of the post being reposted/un-reposted',
    example: 'fd9391ab-9f91-45ef-87a6-df076bb19d0c',
  })
  @IsUUID()
  @IsNotEmpty()
  postId: string;
}
