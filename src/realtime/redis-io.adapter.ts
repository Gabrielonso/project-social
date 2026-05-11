import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { ServerOptions } from 'socket.io';
import { createClient } from 'redis';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  constructor(
    app: INestApplication,
    private readonly configService: ConfigService,
  ) {
    super(app);
  }

  /**
   * Call this once on bootstrap before using the adapter.
   */
  async connectToRedis(): Promise<void> {
    if (this.adapterConstructor) {
      return;
    }

    const host = this.configService.get<string>('REDIS_HOST') || '127.0.0.1';
    const port = Number(this.configService.get<string>('REDIS_PORT') || 6379);
    const password =
      this.configService.get<string>('REDIS_PASSWORD') || undefined;

    const pubClient = createClient({
      socket: { host, port },
      password,
    });
    const subClient = pubClient.duplicate();

    await pubClient.connect();
    await subClient.connect();

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server: any = super.createIOServer(port, {
      cors: {
        origin: '*',
      },
      ...options,
    });

    if (!this.adapterConstructor) {
      throw new Error(
        'RedisIoAdapter not connected. Call connectToRedis() before starting the app.',
      );
    }

    server.adapter(this.adapterConstructor);

    return server;
  }
}
