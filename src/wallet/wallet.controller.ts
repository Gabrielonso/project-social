import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getOne(@Req() req) {
    const { sub: userId } = req.user;

    return this.walletService.getWallet(userId);
  }
}
