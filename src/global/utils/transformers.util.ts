import { TransformFnParams } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';

export const TransformBooleanStringToBoolean = ({ value }: TransformFnParams) => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  throw new BadRequestException(`${value} must be a boolean or boolean string`);
};

export const TransformNumberStringToNumber = ({ value }: TransformFnParams) => {
  if (typeof Number(value) !== 'number')
    throw new BadRequestException(null, `${value} must be a number or numeric string string`);
  return Number(value);
};

export const TransformDateStringToDate = ({ value }: TransformFnParams) => {
  return new Date(value);
};

export const TrimString = ({ value }: TransformFnParams) => {
  return (value as string).trim();
};
export const TransformDateStringToISOString = ({ value }: TransformFnParams) => {
  return new Date(value).toISOString();
};

export const TransformCommaSeparatedStringToArray = ({ value }: TransformFnParams) => {
  return (value as string)
    .trim()
    .split(',')
    .map((value) => value.trim());
};

export const TransformToLowercase = ({ value }: TransformFnParams) => {
  return (value as string).trim().toLowerCase();
};

export const CapitalizeFirstLetter = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
