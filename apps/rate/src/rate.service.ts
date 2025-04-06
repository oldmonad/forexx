import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ExchangeRateRequest, ExchangeRateResponse } from '@app/common';
import { lastValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

interface IExchangeRateResponse {
  result: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: string;
  conversion_rates: Record<string, number>;
}

@Injectable()
export class RateService {
  private readonly exchangerateAPI: string;
  private readonly exchangerateAPIKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
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
      const response = await lastValueFrom(
        this.httpService.get(
          `${this.exchangerateAPI}/${this.exchangerateAPIKey}/latest/${request.baseCode}`,
        ),
      );

      if (response.status !== 200) {
        throw new Error(`Exchange rate API returned ${response.status}`);
      }

      return this.mapExchangeRateResponse(
        response.data as IExchangeRateResponse,
      );
    } catch (error) {
      console.error('Exchange rate API error:', error.message);
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
}
