import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Wallet from './entity/wallet.entity';
import { Repository } from 'typeorm';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepo: Repository<Wallet>,
  ) {}

  getWallet = async (userId: string) => {
    try {
      const userWallet = await this.walletRepo.findOne({
        where: { user: { id: userId } },
      });

      if (!userWallet) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Wallet not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Operation successful',
        data: userWallet,
      };
    } catch (error) {
      throw error;
    }
  };
}
