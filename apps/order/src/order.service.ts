import {
  Inject,
  Injectable,
  ForbiddenException,
  BadRequestException,
  OnModuleInit,
  NotFoundException,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { QueryFailedError, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateOrderDto, CancelOrderDto, FulfillOrderDto } from './dto';
import { OrderEntity, Order, Transaction } from './entity';
import {
  WALLET_PACKAGE,
  WALLET_SERVICE_NAME,
  WalletServiceClient,
  GRPCCurrency,
  ExchangeRateServiceClient,
  EXCHANGE_RATE_SERVICE_NAME,
  EXCHANGERATE_PACKAGE,
  QUEUE_INFO,
  MESSAGE_PATTERNS,
  Currency,
  UpdateType,
} from '@app/common';
import { ClientProxy } from '@nestjs/microservices';

import { catchError } from 'rxjs/operators';
import { throwError, firstValueFrom } from 'rxjs';
import { Metadata } from '@grpc/grpc-js';

interface IExchangeRates {
  [key: string]: number;
}

interface IDTO {
  baseCurrency: Currency;
  amount: number;
  conversionRates: IExchangeRates;
  targetCurrency: Currency;
}

@Injectable()
export class OrderService implements OnModuleInit {
  private walletService: WalletServiceClient;
  private rateService: ExchangeRateServiceClient;

  @InjectRepository(Order)
  private readonly orderRepo: Repository<Order>;

  @InjectRepository(Transaction)
  private readonly transactionRepo: Repository<Transaction>;

  constructor(
    @Inject(WALLET_PACKAGE) private client: ClientGrpc,
    @Inject(EXCHANGERATE_PACKAGE) private rClient: ClientGrpc,
    @Inject(QUEUE_INFO.notificationServiceName)
    private readonly queueClient: ClientProxy,
  ) {}

  onModuleInit() {
    this.walletService =
      this.client.getService<WalletServiceClient>(WALLET_SERVICE_NAME);
    this.rateService = this.rClient.getService<ExchangeRateServiceClient>(
      EXCHANGE_RATE_SERVICE_NAME,
    );
  }

  mapCurrencyToGRPC(currency: Currency): GRPCCurrency {
    switch (currency) {
      case Currency.NGN:
        return GRPCCurrency.NGN;
      case Currency.USD:
        return GRPCCurrency.USD;
      default:
        return GRPCCurrency.CURRENCY_UNSPECIFIED;
    }
  }

  mapGRPCToCurrency(grpcCurrency: GRPCCurrency): Currency {
    switch (grpcCurrency) {
      case GRPCCurrency.NGN:
        return Currency.NGN;
      default:
        return Currency.USD;
    }
  }

  calculateTotalCost(dto: IDTO): number {
    const exchangeRate = dto.conversionRates[dto.targetCurrency];
    const totalCost = exchangeRate * dto.amount;

    return totalCost;
  }

  async createOrder(
    userId: string,
    dto: CreateOrderDto,
    req: Request,
  ): Promise<OrderEntity> {
    try {
      const token = this.extractTokenFromRequest(req);
      const metadata = new Metadata();

      if (token) {
        metadata.add('authorization', token);
      }

      const wallet = await firstValueFrom(
        this.walletService.getWalletByCurrency(
          {
            currency: this.mapCurrencyToGRPC(
              dto.orderType === 'buy' ? dto.quoteCurrency : dto.baseCurrency,
            ),
            userId,
          },
          metadata,
        ),
      );

      if (!wallet) {
        throw new BadRequestException('Invalid wallet');
      }

      const rate = await firstValueFrom(
        this.rateService
          .getExchangeRates({ baseCode: dto.baseCurrency }, metadata)
          .pipe(
            catchError((err) => {
              return throwError(() => new BadRequestException(err.message));
            }),
          ),
      );

      if (!rate) {
        throw new BadRequestException('Invalid rates');
      }

      const totalCost = this.calculateTotalCost({
        baseCurrency: dto.baseCurrency,
        amount: dto.amount,
        conversionRates: rate.conversionRates,
        targetCurrency: dto.quoteCurrency,
      });

      if (dto.orderType === 'sell' && wallet.balance < dto.amount) {
        throw new ForbiddenException(
          `Insufficient balance in ${this.mapGRPCToCurrency(wallet.currency)} wallet`,
        );
      }

      if (dto.orderType === 'buy' && wallet.balance < totalCost) {
        throw new ForbiddenException(
          `Insufficient balance in ${this.mapGRPCToCurrency(wallet.currency)} wallet`,
        );
      }

      const order = await this.orderRepo.manager.transaction(
        async (manager) => {
          const newOrder = await manager.save(Order, {
            userId: userId,
            orderType: dto.orderType,
            baseCurrency: dto.baseCurrency,
            quoteCurrency: dto.quoteCurrency,
            amount: dto.amount,
            totalCost: totalCost,
          });

          await manager.save(Transaction, {
            userId: userId,
            amount: dto.amount,
            totalCost: totalCost,
            exchangeRate: rate.conversionRates[dto.quoteCurrency],
            order: { id: newOrder.id },
          });

          await firstValueFrom(
            this.walletService.updateWallet(
              {
                walletId: wallet.id,
                userId: wallet.userId,
                updateType: UpdateType.WITHDRAWAL,
                amount: dto.orderType === 'buy' ? totalCost : dto.amount,
              },
              metadata,
            ),
          );

          return newOrder;
        },
      );

      return new OrderEntity(order);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw new ForbiddenException('something bad happened');
      }

      throw error;
    }
  }

  async listOrders(): Promise<OrderEntity[]> {
    const orders = await this.orderRepo.find({
      where: { status: 'pending' },
    });

    return orders.map((order) => new OrderEntity(order));
  }

  async fulfillOrder(dto: FulfillOrderDto, req: Request): Promise<OrderEntity> {
    try {
      const token = this.extractTokenFromRequest(req);
      const metadata = new Metadata();

      if (token) {
        metadata.add('authorization', token);
      }

      const order = await this.orderRepo.findOne({
        where: { id: dto.orderId, status: 'pending' },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.userId === dto.userId) {
        throw new ForbiddenException(
          'You are not authorized to fulfill this order',
        );
      }

      const wallet = await firstValueFrom(
        this.walletService.getWalletByCurrency(
          {
            currency: this.mapCurrencyToGRPC(
              order.orderType === 'buy'
                ? order.baseCurrency
                : order.quoteCurrency,
            ),
            userId: dto.userId,
          },
          metadata,
        ),
      );

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      if (order.orderType === 'sell' && wallet.balance < order.totalCost) {
        throw new ForbiddenException(
          `Insufficient balance in ${this.mapGRPCToCurrency(wallet.currency)} wallet`,
        );
      }

      if (order.orderType === 'buy' && wallet.balance < order.amount) {
        throw new ForbiddenException(
          `Insufficient balance in ${this.mapGRPCToCurrency(wallet.currency)} wallet`,
        );
      }

      const firstRecipientWallet = await firstValueFrom(
        this.walletService.getWalletByCurrency(
          {
            currency: this.mapCurrencyToGRPC(
              order.orderType === 'buy'
                ? order.quoteCurrency
                : order.baseCurrency,
            ),
            userId: dto.userId,
          },
          metadata,
        ),
      );

      const secondRecipientWallet = await firstValueFrom(
        this.walletService.getWalletByCurrency(
          {
            currency: this.mapCurrencyToGRPC(
              order.orderType === 'buy'
                ? order.baseCurrency
                : order.quoteCurrency,
            ),
            userId: order.userId,
          },
          metadata,
        ),
      );

      const transaction = await this.transactionRepo.findOne({
        where: { userId: order.userId, order: { id: order.id } },
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      await this.orderRepo.manager.transaction(async (manager) => {
        await manager.update(Order, dto.orderId, { status: 'completed' });
        await manager.update(Transaction, transaction.id, {
          status: 'completed',
        });

        await firstValueFrom(
          this.walletService.updateWallet(
            {
              walletId: wallet.id,
              userId: wallet.userId,
              updateType: UpdateType.WITHDRAWAL,
              amount:
                order.orderType === 'buy' ? order.amount : order.totalCost,
            },
            metadata,
          ),
        );

        await firstValueFrom(
          this.walletService.updateWallet(
            {
              walletId: firstRecipientWallet.id,
              userId: firstRecipientWallet.userId,
              updateType: UpdateType.DEPOSIT,
              amount:
                order.orderType === 'buy' ? order.totalCost : order.amount,
            },
            metadata,
          ),
        );

        await firstValueFrom(
          this.walletService.updateWallet(
            {
              walletId: secondRecipientWallet.id,
              userId: secondRecipientWallet.userId,
              updateType: UpdateType.DEPOSIT,
              amount:
                order.orderType === 'buy' ? order.amount : order.totalCost,
            },
            metadata,
          ),
        );

        await manager.save(Transaction, {
          userId: dto.userId,
          amount: order.amount,
          totalCost: order.totalCost,
          exchangeRate: transaction.exchangeRate,
          order: order,
          status: 'completed',
        });

        this.queueClient.emit(
          MESSAGE_PATTERNS.notificationMessagePattern,
          order.userId,
        );
      });

      const updated = await this.orderRepo.findOne({
        where: {
          id: order.id,
        },
      });

      if (!updated) {
        throw new NotFoundException('Order not found');
      }

      return new OrderEntity(updated);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw new ForbiddenException('something bad happened');
      }

      throw error;
    }
  }

  async cancelOrder(dto: CancelOrderDto, req: Request): Promise<OrderEntity> {
    try {
      const token = (req.headers as { authorization?: string }).authorization;

      const metadata = new Metadata();

      if (token) {
        metadata.add('authorization', token);
        metadata.add('user-id', dto.userId);
      }

      const order = await this.orderRepo.findOne({
        where: {
          id: dto.orderId,
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.userId !== dto.userId) {
        throw new ForbiddenException(
          'You are not authorized to cancel this order',
        );
      }

      if (order.status !== 'pending') {
        throw new ForbiddenException('Invalid order');
      }

      const wallet = await firstValueFrom(
        this.walletService.getWalletByCurrency(
          {
            currency: this.mapCurrencyToGRPC(
              order.orderType === 'buy'
                ? order.quoteCurrency
                : order.baseCurrency,
            ),
            userId: dto.userId,
          },
          metadata,
        ),
      );

      if (!wallet) {
        throw new BadRequestException('Invalid wallet');
      }

      const transaction = await this.transactionRepo.findOne({
        where: { userId: dto.userId, order: { id: order.id } },
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      await this.orderRepo.manager.transaction(async (manager) => {
        await manager.update(Order, dto.orderId, { status: 'cancelled' });
        await manager.update(Transaction, transaction.id, {
          status: 'cancelled',
        });

        await firstValueFrom(
          this.walletService.updateWallet(
            {
              walletId: wallet.id,
              userId: wallet.userId,
              updateType: UpdateType.DEPOSIT,
              amount: order.totalCost,
            },
            metadata,
          ),
        );
      });
      const updated = await this.orderRepo.findOne({
        where: {
          id: order.id,
        },
      });

      if (!updated) {
        throw new NotFoundException('Order not found');
      }

      return new OrderEntity(updated);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw new ForbiddenException('something bad happened');
      }

      throw error;
    }
  }

  extractTokenFromRequest(req: Request): string {
    const token = (req.headers as unknown as { authorization: string })
      .authorization;
    return token;
  }
}
