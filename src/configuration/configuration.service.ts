import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ServiceConfigurationRepository } from './configuration.repository';
import {
  ConfigurationVariable,
  ServiceConfiguration,
  ServiceReplica,
} from './entities/service-configuration.entity';
import { ConnectorService } from './connector.service';
import { EventService } from 'src/event/events.service';
import Ajv from 'ajv';
import { VariableDefinitionsDto } from './dto/variable-definitions.dto';
import { AxiosResponse } from 'axios';

/**
 * Service for handling configurations.
 */
@Injectable()
export class ConfigurationService {
  // in-memory repository for service configurations
  private readonly serviceRepository: ServiceConfigurationRepository;
  // ajv instance for validating variables
  private ajv: any = new Ajv();
  // simple mutex to avoid issues from multiple heartbeats. Works since there will be only one experiment config service.
  private mutex: any = {};

  constructor(
    private readonly connectorService: ConnectorService,
    // use forward reference to avoid circular dependency
    @Inject(forwardRef(() => EventService))
    private readonly eventService: EventService,
    private readonly logger: Logger,
  ) {
    this.serviceRepository = new ServiceConfigurationRepository();
  }

  /**
   * Updates the heartbeat of a service replica.
   * If the service or replica does not exist, it adds a new service with the given name and replica ID.
   * @param serviceName - The name of the service.
   * @param replicaId - The ID of the replica.
   */
  heartbeat(serviceName: string, replicaId: string) {
    if (
      !this.serviceRepository.exists(serviceName) &&
      !this.mutex[serviceName]
    ) {
      return this.handleFirstHeartbeat(serviceName, replicaId);
    }
    const service = this.findService(serviceName);
    const replica = service.replicas.find(
      (replica) => replica.id === replicaId,
    );
    if (!replica) {
      return this.addReplica(serviceName, replicaId);
    }
    // update last seen
    replica.lastSeen = new Date();
  }

  /**
   * Handles the first heartbeat of a service.
   * @param serviceName - The name of the service.
   * @param replicaId - The ID of the replica.
   */
  async handleFirstHeartbeat(serviceName: string, replicaId: string) {
    this.mutex[serviceName] = true;
    this.logger.log(`Service ${serviceName} not found, adding new service`);
    try {
      return this.addService(serviceName, replicaId);
    } catch (error) {
      this.logger.error(`{heartbeat} ${error.message}`);
      this.mutex[serviceName] = false;
      return;
    }
  }

  /**
   * Adds a new service with the given name and initial replica ID.
   * @param serviceName - The name of the service.
   * @param initialReplicaId - The ID of the initial replica.
   * @returns The created service configuration.
   */
  async addService(
    serviceName: string,
    initialReplicaId: string,
  ): Promise<ServiceConfiguration> {
    const service: ServiceConfiguration = {
      name: serviceName,
      replicas: [{ id: initialReplicaId, replicaVariables: [] }],
      globalVariables: [],
      variableDefinitions: [],
    };

    this.logger.log(
      `Adding service ${serviceName} with replica ${initialReplicaId}`,
    );
    this.serviceRepository.create(service);
    return this.buildServiceConfiguration(service);
  }

  /**
   * Adds the global variables and queries variable definitions from the sidecar.
   * Is called directly after the first heartbeat of a service and due to the mutex, there can only be one replica.
   * @param service - The service configuration.
   * @returns The updated service configuration.
   */
  async buildServiceConfiguration(service: ServiceConfiguration): Promise<ServiceConfiguration> {
    const serviceName = service.name;
    // request variable definitions from sidecar
    const { data }: AxiosResponse<VariableDefinitionsDto> =
      await this.connectorService.getConfigFromSidecar(serviceName);
    this.logger.log(`Received variable definitions for service ${serviceName}: ${JSON.stringify(data)}`);

    // iterate over variable definitions and initialise variables and definitions
    Object.entries(data.configuration).forEach(([key, value]) => {
      service.globalVariables.push({
        key: key,
        value: value.defaultValue,
      });
      // set default values for original replica too
      service.replicas[0].replicaVariables.push({
        key: key,
        value: value.defaultValue,
      });
      service.variableDefinitions.push({
        key: key,
        type: value.type,
        defaultValue: value.defaultValue,
      });
    });

    this.serviceRepository.update(serviceName, service);
    this.mutex[serviceName] = false;
    return service;
  }

  /**
   * Adds a new replica to a service configuration.
   * @param serviceName - The name of the service.
   * @param replicaId - The ID of the replica.
   * @returns The updated service configuration.
   * @throws NotFoundException if the service is not found.
   */
  addReplica(serviceName: string, replicaId: string): ServiceConfiguration {
    const service = this.findService(serviceName);
    this.logger.log(`Adding replica ${replicaId} to service ${serviceName}`);
    if (!service) {
      throw new NotFoundException(`Service '${serviceName}' not found`);
    }

    // initialise replica with global variables
    const variables: ConfigurationVariable[] = service.globalVariables;
    service.replicas.push({
      id: replicaId,
      replicaVariables: variables,
      lastSeen: new Date(),
    });
    return service;
  }

  /**
   * Retrieves all service configurations.
   * @returns An array of ServiceConfiguration objects.
   */
  findAllServices(): ServiceConfiguration[] {
    return this.serviceRepository.findAll();
  }

  /**
   * Retrieves all known service names.
   * @returns An array of service names.
   */
  findAllServiceNames(): string[] {
    return this.findAllServices().map((service) => service.name);
  }

  /**
   * Retrieves a service configuration by name.
   * @param name - The name of the service.
   * @returns The service configuration.
   * @throws NotFoundException if the service is not found.
   */
  findService(name: string): ServiceConfiguration {
    const service = this.serviceRepository.findByName(name);
    return service;
  }

  /**
   * Retrieves a specific service configuration variable by name.
   * @param serviceName - The name of the service.
   * @param variableKey - The key of the variable.
   * @returns The variable.
   * @throws NotFoundException if the service is not found.
   */
  getServiceVariable(
    serviceName: string,
    variableKey: string,
  ): ConfigurationVariable {
    const service = this.findService(serviceName);
    const variable = service.globalVariables.find(
      (variable) => variable.key === variableKey,
    );
    if (!variable) {
      throw new NotFoundException(`Variable '${variableKey}' not found`);
    }
    return variable;
  }

  /**
   * Retrieves a replica configuration.
   * @param serviceName - The name of the service.
   * @param replicaId - The ID of the replica.
   * @returns The replica configuration.
   * @throws NotFoundException if the service or replica is not found.
   */
  findReplica(serviceName: string, replicaId: string): ServiceReplica {
    const service = this.findService(serviceName);
    if (!service) {
      throw new NotFoundException(`Service '${serviceName}' not found`);
    }
    const replica = service.replicas.find(
      (replica) => replica.id === replicaId,
    );
    if (!replica) {
      throw new NotFoundException(`Replica '${replicaId}' not found`);
    }
    return replica;
  }

  /**
   * Retrieves a specific replica configuration variable by name.
   * @param serviceName - The name of the service.
   * @param replicaId - The ID of the replica.
   * @param variableKey - The key of the variable.
   * @returns The variable.
   * @throws NotFoundException if the service or replica is not found.
   */
  getReplicaVariable(
    serviceName: string,
    replicaId: string,
    variableKey: string,
  ): ConfigurationVariable {
    const replica = this.findReplica(serviceName, replicaId);
    const variable = replica.replicaVariables.find(
      (variable) => variable.key === variableKey,
    );
    if (!variable) {
      throw new NotFoundException(`Variable '${variableKey}' not found`);
    }
    return variable;
  }

  /**
   * Updates multiple global configuration variable.
   * @param serviceName - The name of the service.
   * @param variables - The updated variables.
   * @returns The updated service configuration.
   * @throws NotFoundException if the service is not found.
   */
  batchAddOrUpdateServiceVariables(
    serviceName: string,
    variables: ConfigurationVariable[],
  ): ServiceConfiguration {
    const service = this.findService(serviceName);
    if (!service) {
      this.logger.error(`{batchAddOrUpdateServiceVariables} Service ${serviceName} not found`)
      throw new NotFoundException(`Service '${serviceName}' not found`);
    }
    try {
      this.validateVariables(variables, serviceName);
      service.globalVariables = variables;
      // update all replicas with new global variables
      service.replicas.forEach((replica) => {
        replica.replicaVariables = structuredClone(service.globalVariables);
      });
      this.serviceRepository.update(serviceName, service);
      // send updated configuration to sidecar
      this.eventService.publishConfiguration(serviceName, service.replicas);
      return service;
    } catch (error) {
      this.logger.error(`{batchAddOrUpdateServiceVariables} ${error.message}`);
      throw error;
    }
  }

  /**
   * Updates multiple replica configuration variables.
   * @param serviceName - The name of the service.
   * @param replicaId - The ID of the replica.
   * @param variables - The updated variables.
   * @returns The updated service configuration.
   * @throws NotFoundException if the service or replica is not found.
   */
  batchAddOrUpdateReplicaVariables(
    serviceName: string,
    replicaId: string,
    variables: ConfigurationVariable[],
  ): ServiceConfiguration {
    try {
      const service = this.findService(serviceName);
      const replica = service.replicas.find(
        (existingReplica) => existingReplica.id === replicaId,
      );
      if (!replica) {
        throw new NotFoundException(`Replica '${replicaId}' not found`);
      }
      this.validateVariables(variables, serviceName);
      replica.replicaVariables = variables;
      this.serviceRepository.update(serviceName, service);
      // send updated configuration to sidecar
      this.eventService.publishConfiguration(serviceName, [replica]);
      return service;
    } catch (error) {
      this.logger.error(`{batchAddOrUpdateReplicaVariables} ${error.message}`);
      throw error;
    }
  }

  /**
   * Validates the configuration variables against the variable definitions of a service.
   * @param variables - The configuration variables to validate.
   * @param serviceName - The name of the service.
   * @throws Error if the variables do not match the variable definitions.
   */
  validateVariables(variables: ConfigurationVariable[], serviceName: string) {
    const { variableDefinitions } = this.findService(serviceName);
    variables.forEach((variable) => {
      const definition = variableDefinitions.find(
        (def) => def.key === variable.key,
      );
      if (!definition) {
        throw new Error(`Variable definition not found for ${variable.key}`);
      }
      const validate = this.ajv.compile(definition.type);
      const valid = validate(variable.value);
      if (!valid) {
        throw new BadRequestException(
          `[${variable.key}] Validation failed: ${validate.errors?.map((err: any) => `${err.instancePath} ${err.message}`).join(', ')}`,
        );
      }
    });
  }

  /**
   * Deletes a service by name.
   * @param name - The name of the service to delete.
   * @returns True if the service was successfully deleted.
   * @throws NotFoundException if the service is not found.
   */
  deleteService(name: string): boolean {
    const deleted = this.serviceRepository.delete(name);
    if (!deleted) {
      this.logger.error(`Failed to delete service ${name} as it does not exist`);
      throw new NotFoundException(`Service '${name}' not found`);
    }
    return deleted;
  }

  /**
   * Deletes a replica by ID.
   * @param serviceName - The name of the service.
   * @param replicaId - The ID of the replica.
   * @returns True if the replica was successfully deleted.
   * @throws NotFoundException if the service is not found.
   * @throws NotFoundException if the replica is not found.
   */
  deleteReplica(serviceName: string, replicaId: string): boolean {
    const service = this.findService(serviceName);
    if (!service) {
      throw new NotFoundException(`Service '${serviceName}' not found`);
    }
    const initialLength = service.replicas.length;
    service.replicas = service.replicas.filter(
      (replica) => replica.id !== replicaId,
    );
    if (service.replicas.length == initialLength) {
      throw new NotFoundException(`Replica '${replicaId}' not found`);
    }
    this.serviceRepository.update(serviceName, service);
    return true;
  }
}
