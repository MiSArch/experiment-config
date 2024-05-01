import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ConfigurationService } from 'src/configuration/configuration.service';
import {
  ConfigurationDto,
  ReplicaConfiguration,
} from './dto/configuration.dto';
import { ServiceReplica } from 'src/configuration/entities/service-configuration.entity';
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
   * @param configuration - The changed replica configurations.
   */
  publishConfiguration(
    serviceName: string,
    configurations: ServiceReplica[],
  ): void {
    // transform configurations to event payload
    const configurationDto = this.buildConfigurationDto(configurations);
    this.eventPublisherService.publishEvent(
      'pubsub',
      `config/${serviceName}`,
      configurationDto,
    );
  }

  /**
   * Builds a configuration DTO from the given service replicas.
   * @param configurations - The service replicas to build the DTO from.
   * @returns The configuration DTO.
   */
  private buildConfigurationDto(
    configurations: ServiceReplica[],
  ): ConfigurationDto {
    const replicaConfigurations: ReplicaConfiguration[] = configurations.map(
      (replica) => {
        const valueMap: Record<string, any> = replica.replicaVariables.reduce(
          (accumulator, currentConfiguration) => {
            accumulator[currentConfiguration.key] = currentConfiguration.value;
            return accumulator;
          },
          {},
        );
        return {
          replicaId: replica.id,
          variables: valueMap,
        };
      },
    );

    return {
      configurations: replicaConfigurations,
    };
  }
}
