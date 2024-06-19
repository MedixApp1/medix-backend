import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as express from 'express';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filter/filter';
import { ENVIRONMENT } from './common/configs/environment';
import { ResponseTransformerInterceptor } from './common/interceptors/response.interceptor';
// import compression from 'compression'
import { APIToolkit } from 'apitoolkit-express';

// import { audioToText } from './common/utils/speechmatics';
// import { readFileSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });
  const apiToolkitClient = APIToolkit.NewClient({
    apiKey: 'lfIaKscfOiozm9FIh6ZsSGoZ9GLDG9Se67m83L8NqmtVoIrH',
    debug: false,
    tags: ['environment: production', 'region: us-east-1'],
    serviceVersion: 'v2.0',
  });

  app.use(helmet());
  app.use(express.json({ limit: '50mb' }));
  app.use(apiToolkitClient.expressMiddleware);
  // app.use(compression())
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  /**
   * interceptors
   */
  app.useGlobalInterceptors(
    new ResponseTransformerInterceptor(app.get(Reflector)),
  );

  /**
   * Set global exception filter
   */
  app.useGlobalFilters(new HttpExceptionFilter());

  /**
   * Set global prefix for routes
   */
  app.setGlobalPrefix('/api/v1');

  /**
   *  Set global pipes
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // const inputFile = new Blob([readFileSync('../medix-backend/src/common/utils/example.wav')]);
  // console.log(await audioToText(inputFile));
  await app.listen(ENVIRONMENT.APP.PORT || 3000);
}
bootstrap();
