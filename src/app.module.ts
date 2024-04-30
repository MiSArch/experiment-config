import { Module } from '@nestjs/common';
import { EventModule } from './event/event.module';
import { ConfigurationModule } from './configuration/configuration.module';

@Module({
  imports: [EventModule, ConfigurationModule],
})
export class AppModule {}
