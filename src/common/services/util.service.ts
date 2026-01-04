import { compare, hash } from 'bcryptjs';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UtilService {
  private readonly _encryptionAlgorithm = 'aes-256-cbc';
  private readonly _encryptionKey: string;

  constructor(private readonly configService: ConfigService) {
    this._encryptionKey = createHash('sha512')
      .update(this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'))
      .digest('base64')
      .substring(0, 32);
  }

  async hashString(input: string): Promise<string> {
    const rounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS') || 12;
    return hash(input, rounds);
  }

  async compareHash(input: string, hashed: string): Promise<boolean> {
    return compare(input, hashed);
  }

  private _decryptCrypto(encryptedText: string): string {
    const [ivHex, dataHex] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedData = Buffer.from(dataHex, 'hex');
    const decipher = createDecipheriv(
      this._encryptionAlgorithm,
      this._encryptionKey,
      iv,
    );
    return Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]).toString();
  }

  generateRandomCharacters(options?: {
    length?: number;
    includeAlphabet?: boolean;
  }): string {
    const length = options?.length || 6;
    const chars = options?.includeAlphabet
      ? '4G2HQAB67LMCDFOV1XZYN5JKI8RST9UEPW03'
      : '1234567890';
    return Array.from(randomBytes(length))
      .map((b) => chars[b % chars.length])
      .join('');
  }

  generateTransactionReference() {
    const num = this.generateRandomCharacters({ length: 6 });
    const ref = this.generateRandomCharacters({
      length: 10,
      includeAlphabet: true,
    });
    return `TRX-${ref}-${num}`;
  }

  computePlatformConversionRate(args: {
    providerRate: number;
    spillage: number;
  }) {
    const { spillage, providerRate } = args;
    return providerRate + (spillage / 100) * providerRate;
  }

  extractProviderConversionRate(args: {
    platformRate: number;
    spillage: number;
  }) {
    const { spillage, platformRate } = args;
    return (platformRate * 100) / (100 + spillage);
  }
}
