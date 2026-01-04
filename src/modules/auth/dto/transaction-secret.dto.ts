import {
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';

@ValidatorConstraint({ name: 'isPinLength', async: false })
export class IsPinLengthConstraint implements ValidatorConstraintInterface {
  validate(pin: string, args: ValidationArguments) {
    return (
      typeof pin === 'string' &&
      pin.length === args.constraints[0] &&
      /^\d+$/.test(pin)
    );
  }

  defaultMessage(args: ValidationArguments) {
    return `PIN must be exactly ${args.constraints[0]} digits long`;
  }
}

export function IsPinLength(
  length: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [length],
      validator: IsPinLengthConstraint,
    });
  };
}

export class TransactionPinDto {
  @IsNotEmpty()
  @IsString()
  @IsPinLength(4, { message: 'PIN must be exactly 4 digits long' })
  txnPin: string;
}

export class ResetTransactionPinDto {
  @IsNotEmpty()
  @IsString()
  pinResetOtp: string;

  @IsNotEmpty()
  @IsString()
  @IsPinLength(4, { message: 'PIN must be exactly 4 digits long' })
  txnPin: string;
}

export class ChangeTransactionPinDto {
  @IsNotEmpty()
  @IsString()
  @IsPinLength(4, { message: 'PIN must be exactly 4 digits long' })
  oldTxnPin: string;

  @IsNotEmpty()
  @IsString()
  @IsPinLength(4, { message: 'PIN must be exactly 4 digits long' })
  newTxnPin: string;
}
