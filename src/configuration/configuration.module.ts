import { Logger, Module, forwardRef } from '@nestjs/common';
import { ConfigurationService } from './configuration.service';
import { ConfigurationController } from './configuration.controller';
import { EventModule } from 'src/event/event.module';
import { ConnectorService } from './connector.service';
import { HttpModule } from '@nestjs/axios';

/**
 * Module for handling configurations.
 */
@Module({
  imports: [
    // To avoid circular dependencies, forwardRef() is used to import the EventModule
    forwardRef(() => EventModule),
    HttpModule,
  ],
  providers: [ConfigurationService, Logger, ConnectorService],
  controllers: [ConfigurationController],
  exports: [ConfigurationService],
})
export class ConfigurationModule {}
