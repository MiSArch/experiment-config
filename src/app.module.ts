import { Module } from '@nestjs/common';
import { EventModule } from './event/event.module';
import { ConfigurationModule } from './configuration/configuration.module';
import { HealthModule } from './health/health.module';

/**
 * Main application module.
 */
@Module({
  imports: [EventModule, ConfigurationModule, HealthModule],
})
export class AppModule {}
