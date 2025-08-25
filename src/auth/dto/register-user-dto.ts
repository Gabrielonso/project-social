import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class RegisterUserDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(5)
  phoneCode: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(11)
  phoneNumber: string;

  @IsString()
  @IsDateString()
  dob: Date;

  @IsString()
  @IsOptional()
  referrerCode: string;
}
