import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { OrderModule } from './order.module';

async function bootstrap() {
  const app = await NestFactory.create(OrderModule);
  const config: ConfigService = app.get(ConfigService);
  const appPort = config.getOrThrow<number>('ORDER_TRANSACTION_SERVICE_PORT');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(appPort);

  const logger = new Logger('Bootstrap');
  logger.log(`Application has started on port ${appPort}`);
}
bootstrap();
