import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  ValidationPipe,
} from '@nestjs/common';
@Injectable()
export class LoggingValidationPipe extends ValidationPipe {
  constructor(options?) {
    super(options);
  }

  async transform(value: any, metadata: ArgumentMetadata) {
    // Call the base class transform method to handle validation and transformation
    try {
      return await super.transform(value, metadata);
    } catch (e) {
      if (e instanceof BadRequestException) {
        // Here you can log the errors
        console.error('Validation errors:', e.getResponse());
        // Optionally, rethrow the error or handle it as needed
        throw e;
      }
      // For other types of errors, just rethrow them
      throw e;
    }
  }
}
