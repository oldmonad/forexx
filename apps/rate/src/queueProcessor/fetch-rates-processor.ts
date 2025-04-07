import {
  Process,
  Processor,
  OnQueueCompleted,
  OnQueueFailed,
  OnQueueActive,
} from '@nestjs/bull';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { lastValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import {
  FETCH_RATE_QUEUE,
  FETCH_RATE_QUEUE_PROCESSOR,
  CURRENCY_SET_KEY,
  ExchangeRateResponse,
  IExchangeRateResponse,
} from '@app/common';
@Processor(FETCH_RATE_QUEUE)
export class FetchRateQueueConsumer {
  private readonly exchangerateAPI: string;
  private readonly exchangerateAPIKey: string;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.exchangerateAPI =
      this.configService.getOrThrow<string>('EXCHANGE_RATE_API');
    this.exchangerateAPIKey = this.configService.getOrThrow<string>(
      'EXCHANGE_RATE_API_KEY',
    );
  }
  private readonly logger = new Logger(FetchRateQueueConsumer.name);

  @Process(FETCH_RATE_QUEUE_PROCESSOR)
  async fetchRates(job: Job) {
    this.logger.log(`Fetching rates .......${job.id}`);

    const currencySet = await this.redis.smembers(CURRENCY_SET_KEY);

    if (!currencySet || currencySet.length === 0) {
      this.logger.warn('No currencies found in the set');
      return;
    }

    for (const currency of currencySet) {
      try {
        const response = await lastValueFrom(
          this.httpService.get(
            `${this.exchangerateAPI}/${this.exchangerateAPIKey}/latest/${currency}`,
          ),
        );

        const mappedResponse = this.mapExchangeRateResponse(
          response.data as IExchangeRateResponse,
        );

        await this.redis.set(
          `currency:${currency}`,
          JSON.stringify(mappedResponse),
        );
      } catch (error) {
        this.logger.error(`Failed to fetch rates for ${currency}`, error);
        throw error;
      }
    }
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Fetching rates ....... ${job.id}`);
  }

  @OnQueueCompleted()
  complete(job: Job) {
    this.logger.log(`Rate data processed ${job.id} .......`);
  }

  @OnQueueFailed()
  failed(job: Job, error: Error) {
    this.logger.log(`Failed to process rates ${job.id} .......`);
    this.logger.error(error);
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
}
