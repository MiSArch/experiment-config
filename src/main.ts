import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { logger } from './shared/logger/winston.config';
import { LoggingValidationPipe } from './shared/pipes/logging-validation.pipe';

/**
 * Initializes and starts the application.
 * @returns {Promise<void>} A promise that resolves when the application is running.
 */
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(new LoggingValidationPipe());
  app.useBodyParser('json', {
    type: ['application/json', 'application/cloudevents+json'],
  });
  app.enableCors({
    origin: ['http://localhost:4200'],
    methods: 'GET,PUT',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  await app.listen(8080);

  app.useLogger(logger);

  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
