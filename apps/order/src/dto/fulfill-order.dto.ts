import { IsNotEmpty, IsUUID } from 'class-validator';

export class FulfillOrderDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsUUID()
  @IsNotEmpty()
  orderId: string;
}

export class FulfillParamsOrderDto {
  @IsUUID()
  @IsNotEmpty()
  id: string;
}
