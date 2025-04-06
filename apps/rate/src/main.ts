import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe, Logger } from '@nestjs/common';
import { RateModule } from './rate.module';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { EXCHANGERATE } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create(RateModule);
  const config: ConfigService = app.get(ConfigService);
  const appPort = config.getOrThrow<number>('RATE_SERVICE_PORT');
  const grpcUrl = config.getOrThrow<string>('RATE_SERVICE_GRPC_URL');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(appPort);

  const logger = new Logger('Bootstrap');
  logger.log(`Application has started on port ${appPort}`);

  // gRPC Microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: EXCHANGERATE,
      protoPath: join(__dirname, '../exchange.proto'),
      url: grpcUrl,
    },
  });

  app.startAllMicroservices();
}
bootstrap();
