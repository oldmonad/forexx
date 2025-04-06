import { NestFactory } from '@nestjs/core';
import { AuthenticationModule } from './authentication.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AuthenticationModule);
  const config: ConfigService = app.get(ConfigService);
  const appPort = config.getOrThrow<number>('AUTHENTICATION_SERVICE_PORT');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(appPort);

  const logger = new Logger('Bootstrap');
  logger.log(`Application has started on port ${appPort}`);
}
bootstrap();
