import { Logger, Module, forwardRef } from '@nestjs/common';
import { EventPublisherService } from './event-publisher.service';
import { EventService } from './events.service';
import { EventController } from './event.controller';
import { ConfigurationModule } from 'src/configuration/configuration.module';

/**
 * Module for handling events.
 */
@Module({
  imports: [
    // To avoid circular dependencies, forwardRef() is used
    forwardRef(() => ConfigurationModule),
  ],
  providers: [EventPublisherService, EventService, Logger],
  controllers: [EventController],
  exports: [EventService, EventPublisherService],
})
export class EventModule {}
