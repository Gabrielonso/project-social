import { BadRequestException } from '@nestjs/common';

export const convertKoboToNaira = (amountInKobo: number | string): number => {
  if (isNaN(Number(amountInKobo))) throw new BadRequestException(null, 'Invalid number format');
  return Number((Number(amountInKobo) / 100).toFixed(4));
};
