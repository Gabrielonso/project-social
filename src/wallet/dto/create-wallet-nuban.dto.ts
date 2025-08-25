import { IsNotEmpty, IsString } from 'class-validator';

export class CreateWalletNubanDto {
  @IsString()
  @IsNotEmpty()
  bvn: string;

  @IsString()
  @IsNotEmpty()
  bvnDateOfBirth: string;
}
