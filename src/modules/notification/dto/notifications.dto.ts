import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsArray,
  ArrayNotEmpty,
  IsNotEmpty,
  IsBoolean,
} from 'class-validator';

export class NotificationsIdsDto {
  @ApiProperty({
    description: 'Ids of notifications',
    example: ['fd9391ab-9f91-45ef-87a6-df076bb19d0c'],
  })
  @IsNotEmpty()
  @ArrayNotEmpty()
  @IsArray()
  @IsUUID('4', { each: true })
  notifications: string[];
}

export class UserNotificationToggleDto {
  @IsNotEmpty()
  @IsBoolean()
  notificationEnabled: boolean;
}
