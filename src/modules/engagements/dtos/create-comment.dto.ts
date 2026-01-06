import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { FeedType } from 'src/modules/feeds/enums/feed-type.enum';

export class CreateCommentDto {
  @ApiProperty({
    description: 'Entity being being commented on',
    example: FeedType.POST,
    enum: FeedType,
  })
  @IsEnum(FeedType)
  @IsNotEmpty()
  entity: FeedType;

  @ApiProperty({
    description: 'Entity ID being commented on',
    example: 'fd9391ab-9f91-45ef-87a6-df076bb19d0c',
  })
  @IsUUID()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({
    description: 'The comment',
    example: 'Can i get more info on this? You look 🔥🔥🔥',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description:
      'Comment ID (When this is comment is a reply to a coment under a post/ad)',
    example: 'fd9391ab-9f91-45ef-87a6-df076bb19d0c',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
