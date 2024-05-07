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

/**
 * Service for handling configurations.
 */
@Injectable()
export class ConfigurationService {
  private readonly serviceRepository: ServiceConfigurationRepository;
  private ajv: any;

  constructor(
    private readonly connectorService: ConnectorService,
    // use forward reference to avoid circular dependency
    @Inject(forwardRef(() => EventService))
    private readonly eventService: EventService,
    private readonly logger: Logger,
  ) {
    this.serviceRepository = new ServiceConfigurationRepository();
    this.ajv = new Ajv()
  }

  /**
   * Updates the heartbeat of a service replica.
   * If the service or replica does not exist, it adds a new service with the given name and replica ID.
   * @param serviceName - The name of the service.
   * @param replicaId - The ID of the replica.
   */
  heartbeat(serviceName: string, replicaId: string) {
    try {
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
    catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.error(`Service ${serviceName} not found, adding new service`);
        this.addService(serviceName, replicaId);
      } else {
        throw error;
      }
    }
  }

  /**
   * Adds a new service with the given name and initial replica ID.
   * @param serviceName - The name of the service.
   * @param initialReplicaId - The ID of the initial replica.
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

    this.logger.log(`Adding service ${serviceName} with replica ${initialReplicaId}`);
    this.serviceRepository.create(service);
    return this.buildServiceConfiguration(service);
  }

  /**
   * Adds the global variables and queries variable definitions from the sidecar.
   * @param service - The service configuration.
   * @returns The updated service configuration.
   */
  async buildServiceConfiguration(service: ServiceConfiguration): Promise<ServiceConfiguration> {
    const serviceName = service.name;
    // request variable definitions from sidecar
    const { data } =
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
      });
    });

    this.serviceRepository.update(serviceName, service);
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
    if (!service) {
      throw new NotFoundException(`Service '${name}' not found`);
    }
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
      this.updateServiceVariables(variables, service);
      // update all replicas with new global variables
      service.replicas.forEach((replica) => {
        replica.replicaVariables = structuredClone(service.globalVariables);
      });
      // send updated configuration to sidecar
      this.eventService.publishConfiguration(serviceName, service.replicas);
      return service;
    } catch (error) {
      this.logger.error(`{batchAddOrUpdateServiceVariables} ${error.message}`)
      throw error;
    }
  }

  /**
   * Updates the service variables with the given configuration variables.
   * If a variable with the same key already exists in the service, it will be updated.
   * Otherwise, the variable will be added to the service.
   * 
   * @param variables - The configuration variables to update the service with.
   * @param service - The service to update.
   */
  private updateServiceVariables(variables: ConfigurationVariable[], service: ServiceConfiguration) {
    variables.forEach((variable) => {
      const existingVarIndex = service.globalVariables.findIndex(
        (existingVariable) => existingVariable.key === variable.key
      );
      if (existingVarIndex > -1) {
        service.globalVariables[existingVarIndex] = variable;
      } else {
        service.globalVariables.push(variable);
      }
    });
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
      if (!service) {
        throw new NotFoundException(`Service '${serviceName}' not found`);
      }
      const replica = service.replicas.find(
        (existingReplica) => existingReplica.id === replicaId,
      );
      if (!replica) {
        throw new NotFoundException(`Replica '${replicaId}' not found`);
      }
      this.validateVariables(variables, serviceName);
      this.updateReplicaVariables(variables, replica);
      // send updated configuration to sidecar
      this.eventService.publishConfiguration(serviceName, [replica]);
      return service;
    } catch (error) {
      this.logger.error(`{batchAddOrUpdateReplicaVariables} ${error.message}`)
      throw error;
    }
  }

  /**
   * Updates the replica variables with the given configuration variables.
   * If a variable with the same key already exists in the replica, it will be updated.
   * Otherwise, the variable will be added to the replica.
   * 
   * @param variables - The configuration variables to update the replica with.
   * @param replica - The service replica to update.
   */
  private updateReplicaVariables(variables: ConfigurationVariable[], replica: ServiceReplica) {
    variables.forEach((variable) => {
      const existingVarIndex = replica.replicaVariables.findIndex(
        (existingVariable) => existingVariable.key === variable.key
      );
      if (existingVarIndex > -1) {
        replica.replicaVariables[existingVarIndex] = variable;
      } else {
        replica.replicaVariables.push(variable);
      }
    });
  }

  /**
   * Validates the configuration variables against the variable definitions of a service.
   * @param variables - The configuration variables to validate.
   * @param serviceName - The name of the service.
   * @throws Error if the variables do not match the variable definitions.
   */
  validateVariables(variables: ConfigurationVariable[], serviceName: string) {
    const { variableDefinitions } = this.findService(serviceName);
    variables.forEach(variable => {
      const definition = variableDefinitions.find(def => def.key === variable.key);
      if (!definition) throw new Error(`Variable definition not found for ${variable.key}`);
      const validate = this.ajv.compile(definition.type);
      const valid = validate(variable.value);
      if (!valid) throw new BadRequestException(`[${variable.key}] Validation failed: ${validate.errors?.map(err => `${err.instancePath} ${err.message}`).join(', ')}`);
    });
  }

  /**
   * Deletes a service by name.
   * @param name - The name of the service to delete.
   * @returns True if the service was successfully deleted, false otherwise.
   */
  deleteService(name: string): boolean {
    return this.serviceRepository.delete(name);
  }

  /**
   * Deletes a replica by ID.
   * @param serviceName - The name of the service.
   * @param replicaId - The ID of the replica.
   * @returns True if the replica was successfully deleted, false otherwise.
   * @throws NotFoundException if the service is not found.
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
    return service.replicas.length < initialLength;
  }
}
