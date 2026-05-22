import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  MaxLength,
  ValidateIf,
  ValidateNested,
  ValidationOptions,
  isEmail,
  isUUID,
  registerDecorator,
  ValidationArguments,
} from 'class-validator';
import { NotificationCategoryEnum } from '../interfaces/notification.interface';
import { Type } from 'class-transformer';
import { UserQueryFilterDto } from 'src/modules/user/dto/user-query-filter.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export function IsUUIDOrEmailArray(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isUUIDOrEmailArray',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (!Array.isArray(value)) return false;
          return value.every((item) => isUUID(item) || isEmail(item));
        },
        defaultMessage(args: ValidationArguments) {
          return `Each item in '${args.property}' must be either a valid UUID or a valid email.`;
        },
      },
    });
  };
}

export class SendNotificationDto {
  @ApiPropertyOptional({
    description: `Title of Notification`,
    example: 'Greetings!!!',
  })
  @IsOptional()
  @MaxLength(50)
  title?: string;

  @ApiProperty({
    description: 'Body of Notification',
    example: 'Hello Guys,\nWelcome to BlueBeep🎉.\nThis is a test message',
  })
  @IsNotEmpty()
  @MaxLength(300)
  body: string;

  @ApiProperty({
    description: 'Category of users to send this notification to',
    example: NotificationCategoryEnum.ALL_USERS,
    enum: NotificationCategoryEnum,
  })
  @IsNotEmpty()
  @IsEnum(NotificationCategoryEnum)
  category: NotificationCategoryEnum;

  @ApiPropertyOptional({
    description: `If category of users is 'selected', you must add the users IDs or emails`,
    example: ['c09289ed-1779-42b5-a2c4-ec29d5eae530', 'inarki99@chiamn.com'],
  })
  @ValidateIf((o) => o.category === NotificationCategoryEnum.SELECTED)
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(10000, {
    message:
      'You can only send notifications to a maximum of 10,000 users at once.',
  })
  @IsUUIDOrEmailArray({
    message: 'Each user must be a valid UUID or a valid email address.',
  })
  users: string[];

  @ApiPropertyOptional({
    description: `If category of users is 'filtered', you must include filters to apply`,
    type: UserQueryFilterDto,
  })
  @ValidateIf((o) => o.category === NotificationCategoryEnum.FILTERED)
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => UserQueryFilterDto)
  filters?: UserQueryFilterDto;

  @IsNumber()
  @IsOptional()
  id?: number;
}
