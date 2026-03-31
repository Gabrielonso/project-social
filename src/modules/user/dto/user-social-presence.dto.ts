import { IsBoolean, IsEnum, IsIn, IsOptional } from 'class-validator';
import {
  UserAudienceAccessOptions,
  UserMessagingBehaviourOptions,
  UserVisibilityOptions,
} from '../interfaces/user.interfaces';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UserSocialPresenceDto {
  @ApiPropertyOptional({
    description: 'Set who can reach user',
    default: UserAudienceAccessOptions.EVERYONE,
  })
  @IsEnum(UserAudienceAccessOptions)
  @IsOptional()
  audienceAccess: UserAudienceAccessOptions;

  @ApiPropertyOptional({
    description: 'Set how messages are delivered to user',
    default: UserMessagingBehaviourOptions.REQUESTS_ONLY,
  })
  @IsEnum(UserMessagingBehaviourOptions)
  @IsOptional()
  messagingBehaviour: UserMessagingBehaviourOptions;

  @ApiPropertyOptional({
    description: 'Set user appear and how people interact with user',
    default: UserVisibilityOptions.VISIBLE,
  })
  @IsEnum(UserVisibilityOptions)
  @IsOptional()
  visibility: UserVisibilityOptions;

  @ApiPropertyOptional({
    type: 'boolean',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  allowLiveInvite: boolean;

  @ApiPropertyOptional({ type: 'boolean', default: true })
  @IsBoolean()
  @IsOptional()
  allowBeep: boolean;

  @ApiPropertyOptional({
    type: 'boolean',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  readReceipts: boolean;

  @ApiPropertyOptional({
    type: 'boolean',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  profileVisitVisibility: boolean;

  @ApiPropertyOptional({
    type: 'boolean',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  showLastActive: boolean;
}
