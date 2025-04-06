import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  UseGuards,
  Param,
} from '@nestjs/common';
import { isAxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { HttpException } from '@nestjs/common';
import { ApiGatewayService } from './api-gateway.service';
import { RegisterDto, SigninDto } from '../../authentication/src/dto';
import { UserEntity } from '@app/global.guard';
import { WalletEntity } from '../../wallet/src/entity';
import { AuthHeaderGuard, AuthenticatedRequest } from './guard';
import { CreateOrderDto } from '../../order/src/dto';
import { OrderEntity } from '../../order/src/entity';

interface RegisterResponse {
  data: UserEntity;
}

interface SigninResponse {
  data: {
    accessToken: string;
    refreshToken: string;
  };
}

@Controller()
export class ApiGatewayController {
  private readonly authServiceUrl: string;
  private readonly walletServiceUrl: string;
  private readonly orderServiceUrl: string;

  constructor(
    private readonly apiGatewayService: ApiGatewayService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.authServiceUrl =
      this.configService.getOrThrow<string>('AUTH_SERVICE_URL');
    this.walletServiceUrl =
      this.configService.getOrThrow<string>('WALLET_SERVICE_URL');
    this.orderServiceUrl =
      this.configService.getOrThrow<string>('ORDER_SERVICE_URL');
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    try {
      const response$ = this.httpService.post<RegisterResponse>(
        `${this.authServiceUrl}/register`,
        dto,
      );
      const response = await lastValueFrom(response$);
      return response.data;
    } catch (error: unknown) {
      this.handleHttpError(error, 'Registration failed');
    }
  }

  @Post('signin')
  async signin(@Body() dto: SigninDto) {
    try {
      const response$ = this.httpService.post<SigninResponse>(
        `${this.authServiceUrl}/signin`,
        dto,
      );
      const response = await lastValueFrom(response$);
      return response.data;
    } catch (error: unknown) {
      this.handleHttpError(error, 'Login failed');
    }
  }

  @Get('wallets')
  @UseGuards(AuthHeaderGuard)
  async getWallets(@Req() req: AuthenticatedRequest) {
    try {
      const response$ = this.httpService.get<WalletEntity[]>(
        `${this.walletServiceUrl}/wallets`,
        { headers: { Authorization: req.headers.authorization } },
      );
      const response = await lastValueFrom(response$);
      return response.data;
    } catch (error: unknown) {
      this.handleHttpError(error, 'Wallet retrieval failed');
    }
  }

  @Post('orders')
  @UseGuards(AuthHeaderGuard)
  async createOrder(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateOrderDto,
  ) {
    try {
      const response$ = this.httpService.post<OrderEntity>(
        `${this.orderServiceUrl}/orders`,
        dto,
        { headers: { Authorization: req.headers.authorization } },
      );
      const response = await lastValueFrom(response$);
      return response.data;
    } catch (error: unknown) {
      this.handleHttpError(error, 'Order creation failed');
    }
  }

  @Get('orders')
  @UseGuards(AuthHeaderGuard)
  async getOrders(@Req() req: AuthenticatedRequest) {
    try {
      const response$ = this.httpService.get<OrderEntity[]>(
        `${this.orderServiceUrl}/orders`,
        { headers: { Authorization: req.headers.authorization } },
      );
      const response = await lastValueFrom(response$);
      return response.data;
    } catch (error: unknown) {
      this.handleHttpError(error, 'Order retrieval failed');
    }
  }

  @Post('orders/:id/cancel')
  @UseGuards(AuthHeaderGuard)
  async cancelOrder(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    try {
      const response$ = this.httpService.post<OrderEntity>(
        `${this.orderServiceUrl}/orders/${id}/cancel`,
        {},
        { headers: { Authorization: req.headers.authorization } },
      );
      const response = await lastValueFrom(response$);
      return response.data;
    } catch (error: unknown) {
      this.handleHttpError(error, 'Order cancellation failed');
    }
  }

  @Post('orders/:id/fulfill')
  @UseGuards(AuthHeaderGuard)
  async fulfillOrder(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    try {
      const response$ = this.httpService.post<OrderEntity>(
        `${this.orderServiceUrl}/orders/${id}/fulfill`,
        {},
        { headers: { Authorization: req.headers.authorization } },
      );
      const response = await lastValueFrom(response$);
      return response.data;
    } catch (error: unknown) {
      this.handleHttpError(error, 'Order fulfillment failed');
    }
  }

  handleHttpError(
    error: unknown,
    defaultMessage: string = 'Operation failed',
  ): never {
    if (isAxiosError(error)) {
      throw new HttpException(
        error.message ? error.message : defaultMessage,
        error.response?.status || 500,
      );
    } else {
      throw new HttpException(defaultMessage, 500);
    }
  }
}
