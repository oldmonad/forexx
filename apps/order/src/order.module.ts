import { Module } from '@nestjs/common';
import * as Joi from 'joi';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import {
  QUEUE_INFO,
  WALLET,
  WALLET_PACKAGE,
  EXCHANGERATE,
  EXCHANGERATE_PACKAGE,
} from '@app/common';
import { Order, Transaction } from './entity';
import { GlobalGuardModule } from '@app/global.guard';

@Module({
  imports: [
    GlobalGuardModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        ORDER_TRANSACTION_POSTGRES_HOST: Joi.string().required(),
        ORDER_TRANSACTION_POSTGRES_PORT: Joi.number().required(),
        ORDER_TRANSACTION_POSTGRES_USER: Joi.string().required(),
        ORDER_TRANSACTION_POSTGRES_PASSWORD: Joi.string().default('').allow(''),
        ORDER_TRANSACTION_POSTGRES_DATABASE: Joi.string().required(),
        RABBITMQ_CONNECTION_URL: Joi.string().required(),
        WALLET_SERVICE_GRPC_URL: Joi.string().required(),
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow<string>('ORDER_TRANSACTION_POSTGRES_HOST'),
        port: parseInt(
          config.getOrThrow<string>('ORDER_TRANSACTION_POSTGRES_PORT'),
        ),
        username: config.getOrThrow<string>('ORDER_TRANSACTION_POSTGRES_USER'),
        password: config.getOrThrow<string>(
          'ORDER_TRANSACTION_POSTGRES_PASSWORD',
        ),
        database: config.getOrThrow<string>(
          'ORDER_TRANSACTION_POSTGRES_DATABASE',
        ),
        entities: [Order, Transaction],
        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature([Order, Transaction]),
    ClientsModule.registerAsync([
      {
        name: QUEUE_INFO.notificationServiceName,
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.getOrThrow<string>('RABBITMQ_CONNECTION_URL')],
            queue: QUEUE_INFO.notificationQueueName,
            queueOptions: {
              durable: false,
            },
          },
        }),
        inject: [ConfigService],
      },
      {
        name: WALLET_PACKAGE,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: WALLET,
            protoPath: join(__dirname, '../wallet.proto'),
            url: config.getOrThrow<string>('WALLET_SERVICE_GRPC_URL'),
          },
        }),
      },
      {
        name: EXCHANGERATE_PACKAGE,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: EXCHANGERATE,
            protoPath: join(__dirname, '../exchange.proto'),
            url: config.getOrThrow<string>('RATE_SERVICE_GRPC_URL'),
          },
        }),
      },
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
