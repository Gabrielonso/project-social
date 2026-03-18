import {
  IsBooleanString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  UserFilterByEnum,
  UserStatusEnum,
} from '../interfaces/user.interfaces';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UserQueryFilterDto {
  // @ApiPropertyOptional({
  //   required: false,
  //   type: String,
  //   description: 'User status',
  //   example: UserStatusEnum.ACTIVATED,
  //   enum: UserStatusEnum,
  // })
  // @IsOptional()
  // @IsEnum(UserStatusEnum)
  // status?: UserStatusEnum;

  // @ApiPropertyOptional({
  //   required: false,
  //   type: Boolean,
  //   description: 'Verified or unverified users',
  //   example: true,
  // })
  // @IsOptional()
  // @IsBooleanString()
  // verified?: boolean;

  @ApiPropertyOptional({
    required: false,
    type: String,
    description: 'Search user by first name, last name or username',
    example: 'badboytims',
  })
  @IsOptional()
  @IsString()
  search?: string;

  // @ValidateIf((o) => o.filterBy === UserFilterByEnum.dob)
  // @IsNotEmpty()
  // startDate?: Date;

  // @ValidateIf((o) => o.filterBy === UserFilterByEnum.dob)
  // @IsNotEmpty()
  // endDate?: Date;

  @ApiPropertyOptional({
    required: false,
    type: Number,
    description: 'Page number for pagination',
    example: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 10,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  limit?: number;

  // @ApiPropertyOptional({
  //   required: false,
  //   type: String,
  //   description: 'Filter users by date of birth or by verification',
  //   example: UserFilterByEnum.dob,
  //   enum: UserFilterByEnum,
  // })
  // @IsOptional()
  // @IsEnum(UserFilterByEnum)
  // filterBy?: UserFilterByEnum;
}
