import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { FeedType } from 'src/modules/feeds/enums/feed-type.enum';

export class ToggleLikeDto {
  @ApiProperty({
    description: 'Entity being liked/disliked',
    example: FeedType.POST,
    enum: FeedType,
  })
  @IsEnum(FeedType)
  @IsNotEmpty()
  entity: FeedType;

  @ApiProperty({
    description: 'Entity ID being liked/disliked',
    example: 'fd9391ab-9f91-45ef-87a6-df076bb19d0c',
  })
  @IsUUID()
  @IsNotEmpty()
  entityId: string;
}
