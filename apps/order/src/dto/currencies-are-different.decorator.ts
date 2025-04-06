import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function CurrenciesAreDifferent(validationOptions?: ValidationOptions) {
  return function (constructor: Function) {
    registerDecorator({
      name: 'currenciesAreDifferent',
      target: constructor,
      propertyName: 'currenciesAreDifferent',
      options: validationOptions,
      validator: {
        validate(_value: any, args: ValidationArguments) {
          const obj = args.object as any;
          return obj.baseCurrency !== obj.quoteCurrency;
        },
      },
    });
  };
}
