import { IsEnum, IsNotEmpty } from 'class-validator';
import { NubanProvider } from '../entity/wallet.entity';

export class CreatePaymentAccountDto {
  @IsNotEmpty()
  @IsEnum(NubanProvider)
  provider: NubanProvider;
}
