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
  @IsOptional()
  @MaxLength(50)
  title?: string;

  @IsNotEmpty()
  @MaxLength(300)
  body: string;

  @IsNotEmpty()
  @IsEnum(NotificationCategoryEnum)
  category: NotificationCategoryEnum;

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

  @ValidateIf((o) => o.category === NotificationCategoryEnum.FILTERED)
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => UserQueryFilterDto)
  filters?: UserQueryFilterDto;

  @IsNumber()
  @IsOptional()
  id?: number;
}
