import { IsNotEmpty, IsUUID } from 'class-validator';

export class CancelOrderDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsUUID()
  @IsNotEmpty()
  orderId: string;
}

export class CancelParamsOrderDto {
  @IsUUID()
  @IsNotEmpty()
  id: string;
}
