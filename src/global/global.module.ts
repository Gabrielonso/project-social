import { AsyncLocalStorage } from 'async_hooks';
import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// import { EmailService } from '../email/email.service';
import { AuthModule } from '../auth/auth.module'; // ← import the module that provides JwtService
import { ASYNC_STORAGE } from './constants';

import { UtilService } from './services/util.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    HttpModule,
    AuthModule, // ← make JwtService available to UtilService
  ],
  providers: [
    {
      provide: ASYNC_STORAGE,
      useValue: new AsyncLocalStorage(),
    },
    UtilService,
  ],
  exports: [ASYNC_STORAGE, UtilService, HttpModule],
})
export class GlobalModule {}
