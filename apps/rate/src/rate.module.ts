import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { RedisModule } from '@nestjs-modules/ioredis';
import * as Joi from 'joi';
import { RateController } from './rate.controller';
import { RateService } from './rate.service';
import { FETCH_RATE_QUEUE } from '@app/common';
import { FetchRateQueueConsumer } from './queueProcessor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        REDIS_URL: Joi.string().required(),
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().required(),
        REDIS_PASSWORD: Joi.string().default('').allow(''),
      }),
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'single',
        url: config.getOrThrow<string>('REDIS_URL'),
      }),
    }),
    BullModule.registerQueueAsync({
      name: FETCH_RATE_QUEUE,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.getOrThrow<string>('REDIS_HOST'),
          port: configService.getOrThrow<number>('REDIS_PORT'),
          password: configService.getOrThrow<string>('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          removeOnComplete: true,
          backoff: {
            type: 'exponential',
            delay: 10000,
          },
        },
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    HttpModule,
  ],
  controllers: [RateController],
  providers: [RateService, FetchRateQueueConsumer],
  exports: [HttpModule],
})
export class RateModule {}
