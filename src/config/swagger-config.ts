import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const ConfigureSwagger = (app: INestApplication) => {
  const config = new DocumentBuilder()
    .setTitle('Creators Avenue APIs')
    .setDescription(`API for Creators avenue...`)
    .addBearerAuth()
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      persistAuthorization: true,
      filter: true,
    },
    customSiteTitle: 'Creators avenue api Docs',
  });
};
