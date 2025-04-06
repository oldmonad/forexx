import { IsNotEmpty, IsUUID, IsNumber, IsEnum } from 'class-validator';

export enum BalanceUpdateType {
  INCREMENT = 'INCREMENT',
  DECREMENT = 'DECREMENT',
}

export class UpdateWalletDto {
  @IsUUID()
  @IsNotEmpty()
  walletId: string;

  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsEnum(BalanceUpdateType)
  @IsNotEmpty()
  updateType: BalanceUpdateType;
}
