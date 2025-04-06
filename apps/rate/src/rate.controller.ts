import { BadRequestException, Controller } from '@nestjs/common';
import { RateService } from './rate.service';
import {
  ExchangeRateServiceController,
  ExchangeRateServiceControllerMethods,
  ExchangeRateRequest,
  ExchangeRateResponse,
} from '@app/common';

@Controller()
@ExchangeRateServiceControllerMethods()
export class RateController implements ExchangeRateServiceController {
  constructor(private readonly rateService: RateService) {}

  async getExchangeRates(
    request: ExchangeRateRequest,
  ): Promise<ExchangeRateResponse> {
    try {
      return await this.rateService.getExchangeRates(request);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
