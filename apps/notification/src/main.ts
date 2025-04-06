import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NotificationModule } from './notification.module';
import { QUEUE_INFO } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create(NotificationModule);
  const config: ConfigService = app.get(ConfigService);
  const appPort = config.getOrThrow<number>('NOTIFICATION_SERVICE_PORT');
  const rabbitmqUrl = config.getOrThrow<string>('RABBITMQ_CONNECTION_URL');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(appPort);

  const logger = new Logger('Bootstrap');
  logger.log(`Application has started on port ${appPort}`);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: QUEUE_INFO.notificationQueueName,
      queueOptions: {
        durable: false,
      },
    },
  });

  app.startAllMicroservices();
}
bootstrap();
