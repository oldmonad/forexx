import { IsEnum, IsNotEmpty, IsUUID, IsNumber } from 'class-validator';
import { Currency } from '@app/common';

export class CreateWalletDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  @IsNotEmpty()
  balance: number;

  @IsEnum(Currency)
  @IsNotEmpty()
  currency: Currency;
}
