import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class VerifyBvnDto {
  @IsString()
  @IsNotEmpty()
  bvn: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  dateOfBirth: string;

  @IsString()
  @IsNotEmpty()
  mobileNo: string;
}
