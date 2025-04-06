import { IsNotEmpty, IsNumber, IsIn, IsString } from 'class-validator';
import { Currency } from '@app/common';
import { CurrenciesAreDifferent } from './currencies-are-different.decorator';

@CurrenciesAreDifferent({
  message: 'baseCurrency and quoteCurrency must be different',
})
export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['buy', 'sell'])
  orderType: 'buy' | 'sell';

  @IsIn([Currency.NGN, Currency.USD])
  baseCurrency: Currency;

  @IsIn([Currency.NGN, Currency.USD])
  quoteCurrency: Currency;

  @IsNumber()
  @IsNotEmpty()
  amount: number;
}
