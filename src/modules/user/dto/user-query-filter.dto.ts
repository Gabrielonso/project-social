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

export class UserQueryFilterDto {
  @IsOptional()
  @IsEnum(UserStatusEnum)
  status?: UserStatusEnum;

  @IsOptional()
  @IsBooleanString()
  verified?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @ValidateIf((o) => o.filterBy === UserFilterByEnum.dob)
  @IsNotEmpty()
  startDate?: Date;

  @ValidateIf((o) => o.filterBy === UserFilterByEnum.dob)
  @IsNotEmpty()
  endDate?: Date;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsEnum(UserFilterByEnum)
  filterBy?: UserFilterByEnum;
}
