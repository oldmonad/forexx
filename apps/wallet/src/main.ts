import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { WalletModule } from './wallet.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { QUEUE_INFO, WALLET } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create(WalletModule);
  const config: ConfigService = app.get(ConfigService);
  const appPort = config.getOrThrow<number>('WALLET_SERVICE_PORT');
  const rabbitmqUrl = config.getOrThrow<string>('RABBITMQ_CONNECTION_URL');
  const grpcUrl = config.getOrThrow<string>('WALLET_SERVICE_GRPC_URL');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(appPort);

  const logger = new Logger('Bootstrap');
  logger.log(`Application has started on port ${appPort}`);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: QUEUE_INFO.walletQueueName,
      queueOptions: {
        durable: false,
      },
    },
  });

  // gRPC Microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: WALLET,
      protoPath: join(__dirname, '../wallet.proto'),
      url: grpcUrl,
    },
  });

  app.startAllMicroservices();
}

bootstrap();
