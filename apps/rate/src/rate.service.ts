import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ExchangeRateRequest, ExchangeRateResponse } from '@app/common';
import { lastValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import {
  FETCH_RATE_QUEUE,
  FETCH_RATE_QUEUE_PROCESSOR,
  CURRENCY_SET_KEY,
  IExchangeRateResponse,
} from '@app/common';

@Injectable()
export class RateService {
  private readonly exchangerateAPI: string;
  private readonly exchangerateAPIKey: string;
  private readonly logger = new Logger(RateService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectQueue(FETCH_RATE_QUEUE) private rateQueue: Queue,
    @InjectRedis() private readonly redis: Redis,
  ) {
    this.exchangerateAPI =
      this.configService.getOrThrow<string>('EXCHANGE_RATE_API');
    this.exchangerateAPIKey = this.configService.getOrThrow<string>(
      'EXCHANGE_RATE_API_KEY',
    );
  }

  async getExchangeRates(
    request: ExchangeRateRequest,
  ): Promise<ExchangeRateResponse> {
    try {
      const cachedRate = await this.redis.get(`currency:${request.baseCode}`);

      if (cachedRate) {
        return JSON.parse(cachedRate) as ExchangeRateResponse;
      }

      const response = await lastValueFrom(
        this.httpService.get(
          `${this.exchangerateAPI}/${this.exchangerateAPIKey}/latest/${request.baseCode}`,
        ),
      );

      if (response.status !== 200) {
        throw new Error(`Exchange rate API returned ${response.status}`);
      }

      const mappedResponse = this.mapExchangeRateResponse(
        response.data as IExchangeRateResponse,
      );

      await this.redis.set(
        `currency:${request.baseCode}`,
        JSON.stringify(mappedResponse),
      );

      await this.redis.sadd(CURRENCY_SET_KEY, request.baseCode);

      return mappedResponse;
    } catch (error) {
      this.logger.warn('Exchange rate API error:', error.message);
      throw new BadRequestException('Failed to fetch exchange rates');
    }
  }

  mapExchangeRateResponse(
    apiResponse: IExchangeRateResponse,
  ): ExchangeRateResponse {
    return {
      result: apiResponse.result,
      documentation: apiResponse.documentation,
      termsOfUse: apiResponse.terms_of_use,
      timeLastUpdateUnix: apiResponse.time_last_update_unix,
      timeLastUpdateUtc: apiResponse.time_last_update_utc,
      timeNextUpdateUnix: apiResponse.time_next_update_unix,
      timeNextUpdateUtc: apiResponse.time_next_update_utc,
      baseCode: apiResponse.base_code,
      conversionRates: apiResponse.conversion_rates,
    };
  }

  // Runs every midnight
  @Cron('0 0 0 * * *')
  async handleCron() {
    await this.rateQueue.add(FETCH_RATE_QUEUE_PROCESSOR, {});
  }
}
