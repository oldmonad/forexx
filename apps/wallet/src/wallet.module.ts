import { Module } from '@nestjs/common';
import * as Joi from 'joi';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { GlobalGuardModule } from '@app/global.guard';
import { Wallet } from './entity';
import { QUEUE_INFO } from '@app/common';

@Module({
  imports: [
    GlobalGuardModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        WALLET_POSTGRES_HOST: Joi.string().required(),
        WALLET_POSTGRES_PORT: Joi.number().required(),
        WALLET_POSTGRES_USER: Joi.string().required(),
        WALLET_POSTGRES_PASSWORD: Joi.string().default('').allow(''),
        WALLET_POSTGRES_DATABASE: Joi.string().required(),
        RABBITMQ_CONNECTION_URL: Joi.string().required(),
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow<string>('WALLET_POSTGRES_HOST'),
        port: parseInt(config.getOrThrow<string>('WALLET_POSTGRES_PORT')),
        username: config.getOrThrow<string>('WALLET_POSTGRES_USER'),
        password: config.getOrThrow<string>('WALLET_POSTGRES_PASSWORD'),
        database: config.getOrThrow<string>('WALLET_POSTGRES_DATABASE'),
        entities: [Wallet],
        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature([Wallet]),
    ClientsModule.registerAsync([
      {
        name: QUEUE_INFO.walletServiceName,
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.getOrThrow<string>('RABBITMQ_CONNECTION_URL')],
            queue: QUEUE_INFO.walletQueueName,
            queueOptions: {
              durable: false,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}
