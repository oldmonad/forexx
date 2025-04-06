import {
  Controller,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  Body,
  Get,
  Req,
  Param,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderEntity } from './entity';
import {
  GlobalGuardService,
  UserEntity,
  SerializeUser,
} from '@app/global.guard';
import {
  CreateOrderDto,
  FulfillParamsOrderDto,
  CancelParamsOrderDto,
} from './dto';

@Controller()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @UseGuards(GlobalGuardService)
  @HttpCode(HttpStatus.CREATED)
  @Post('orders')
  async createBuyOrder(
    @SerializeUser() user: UserEntity,
    @Body() data: CreateOrderDto,
    @Req() req: Request,
  ): Promise<OrderEntity> {
    return this.orderService.createOrder(user.id, data, req);
  }

  @UseGuards(GlobalGuardService)
  @HttpCode(HttpStatus.OK)
  @Get('orders/')
  async listOrders(): Promise<OrderEntity[]> {
    return this.orderService.listOrders();
  }

  @UseGuards(GlobalGuardService)
  @HttpCode(HttpStatus.OK)
  @Post('orders/:id/fulfill')
  async fulfillOrder(
    @SerializeUser() user: UserEntity,
    @Param() params: FulfillParamsOrderDto,
    @Req() req: Request,
  ): Promise<OrderEntity> {
    return this.orderService.fulfillOrder(
      {
        userId: user.id,
        orderId: params.id,
      },
      req,
    );
  }

  @UseGuards(GlobalGuardService)
  @HttpCode(HttpStatus.OK)
  @Post('orders/:id/cancel')
  async cancelOrder(
    @SerializeUser() user: UserEntity,
    @Param() params: CancelParamsOrderDto,
    @Req() req: Request,
  ): Promise<OrderEntity> {
    return this.orderService.cancelOrder(
      {
        userId: user.id,
        orderId: params.id,
      },
      req,
    );
  }
}
