import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { GlobalGuardService } from './global.guard.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  providers: [GlobalGuardService],
  exports: [GlobalGuardService, HttpModule, ConfigModule],
})
export class GlobalGuardModule {}
