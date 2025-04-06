import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { RateController } from './rate.controller';
import { RateService } from './rate.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [RateController],
  providers: [RateService],
  exports: [HttpModule],
})
export class RateModule {}
