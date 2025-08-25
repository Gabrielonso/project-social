import { IsNotEmpty, IsNumber } from 'class-validator';

export class FundWalletDto {
  @IsNotEmpty()
  @IsNumber()
  amount: number;
}
