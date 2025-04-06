import { Module } from '@nestjs/common';
import * as Joi from 'joi';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { accessTokenConfig, refreshTokenConfig } from './config';
import { AccessTokenStrategy, RefreshTokenStrategy } from './strategy';
import { GlobalGuardModule, User, RefreshToken } from '@app/global.guard';
import { QUEUE_INFO } from '@app/common';

@Module({
  imports: [
    GlobalGuardModule,
    JwtModule.register({}),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        AUTH_POSTGRES_HOST: Joi.string().required(),
        AUTH_POSTGRES_PORT: Joi.number().required(),
        AUTH_POSTGRES_USER: Joi.string().required(),
        AUTH_POSTGRES_PASSWORD: Joi.string().default('').allow(''),
        AUTH_POSTGRES_DATABASE: Joi.string().required(),
        AUTH_ACCESS_TOKEN_SECRET: Joi.string().required(),
        AUTH_REFRESH_TOKEN_SECRET: Joi.string().required(),
        RABBITMQ_CONNECTION_URL: Joi.string().required(),
      }),
      load: [accessTokenConfig, refreshTokenConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow<string>('AUTH_POSTGRES_HOST'),
        port: parseInt(config.getOrThrow<string>('AUTH_POSTGRES_PORT')),
        username: config.getOrThrow<string>('AUTH_POSTGRES_USER'),
        password: config.getOrThrow<string>('AUTH_POSTGRES_PASSWORD'),
        database: config.getOrThrow<string>('AUTH_POSTGRES_DATABASE'),
        entities: [User, RefreshToken],
        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature([User, RefreshToken]),
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
  controllers: [AuthenticationController],
  providers: [AuthenticationService, AccessTokenStrategy, RefreshTokenStrategy],
})
export class AuthenticationModule {}
