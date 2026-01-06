import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ReplyCommentDto {
  @ApiProperty({
    description: 'Comment reply',
    example: 'Can i get more info on this? You look 🔥🔥🔥',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}
