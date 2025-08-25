import helmet from 'helmet';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { corsOptions } from './cors.config';

export const ConfigureApp = (app: INestApplication) => {
  app.use(helmet());
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      forbidUnknownValues: true,
      forbidNonWhitelisted: true,
      whitelist: true,
    }),
  );

  // const logger = app.get(AppLoggerService);
  // app.useLogger(logger);

  app.enableCors(corsOptions as CorsOptions);

  // app.useGlobalGuards(new CustomAuthGuard(app));
};
