import { IsNotEmpty, IsUUID } from 'class-validator';

export class ListWalletDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;
}
