import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  ValidationPipe,
} from '@nestjs/common';

/**
 * A custom validation pipe that extends the ValidationPipe class.
 * This pipe handles validation and transformation of incoming values.
 * If a BadRequestException is thrown during validation, it logs the errors and rethrows the exception.
 * For other types of exceptions, it rethrows them as well.
 */
@Injectable()
export class LoggingValidationPipe extends ValidationPipe {
  constructor(options?: any) {
    super(options);
  }

  async transform(value: any, metadata: ArgumentMetadata) {
    try {
      return await super.transform(value, metadata);
    } catch (e) {
      if (e instanceof BadRequestException) {
        console.error('Validation errors:', e.getResponse());
        throw e;
      }
      throw e;
    }
  }
}
