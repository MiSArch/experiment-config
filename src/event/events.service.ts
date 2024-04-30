import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ConfigurationService } from 'src/configuration/configuration.service';
import { ConfigurationDto } from './dto/configuration.dto';
import { ConfigurationVariable } from 'src/configuration/entities/service-configuration.entity';
import { EventPublisherService } from './event-publisher.service';

/**
 * Service for handling events.
 */
@Injectable()
export class EventService {
  constructor(
    // use forward reference to avoid circular dependency
    @Inject(forwardRef(() => ConfigurationService))
    private readonly configurationService: ConfigurationService,
    private readonly eventPublisherService: EventPublisherService,
    private readonly logger: Logger,
  ) {}

  /**
   * Forwards a heartbeat event to the configuration module.
   * @param serviceName - The name of the service.
   * @param replicaId - The id of the replica.
   * @returns A promise that resolves to void.
   */
  async heartbeat(serviceName: string, replicaId: string): Promise<any> {
    return this.configurationService.heartbeat(serviceName, replicaId);
  }

  /**
   * Publishes a configuration.
   * This event leads to the replica adjusting its configuration via the experiment-config sidecar.
   * @param configuration - The new configuration dto for the replica.
   */
  publishConfiguration(configurations: ConfigurationVariable[]): void {
    // transform configurations to event payload
    const valueMap: Record<string, any> = configurations.reduce(
      (accumulator, currentConfiguration) => {
        accumulator[currentConfiguration.key] = currentConfiguration.value;
        return accumulator;
      },
      {},
    );
    const eventPayload: ConfigurationDto = {
      configuration: valueMap,
    };
    this.eventPublisherService.publishEvent(
      'pubsub',
      'payment/payment/payment-failed',
      eventPayload,
    );
  }
}
