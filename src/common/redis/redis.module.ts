import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST');
        const port = Number(configService.get<string>('REDIS_PORT') || 6379);
        const username = configService.get<string>('REDIS_USERNAME') || undefined;
        const password = configService.get<string>('REDIS_PASSWORD') || undefined;

        return new Redis({
          host,
          port,
          username,
          password,
          maxRetriesPerRequest: 2,
          enableReadyCheck: true,
          lazyConnect: false,
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}

