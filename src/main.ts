import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { useContainer } from 'class-validator';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from 'src/common/filters/http-exception.filter';
import { AllExceptionsFilter } from 'src/common/filters/all-exception.filter';
import { ConfigureSwagger } from './config/swagger-config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || configService.get<number>('PORT') || 4001;
  const env = configService.get<number>('NODE_ENV');
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(
    new HttpExceptionFilter(configService),
    new AllExceptionsFilter(httpAdapterHost),
  );
  app.enableCors();
  app.setGlobalPrefix('v1');
  ConfigureSwagger(app);
  await app.listen(port);
  console.log(`Social project ${env} is up and running on port: ${port}!`);
}
bootstrap();
