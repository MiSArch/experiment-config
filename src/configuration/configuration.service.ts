import { Injectable, NotFoundException } from '@nestjs/common';
import { ServiceConfigurationRepository } from './configuration.repository';
import {
  ConfigurationVariable,
  ServiceConfiguration,
  ServiceReplica,
} from './entities/service-configuration.entity';
import { ConnectorService } from './connector.service';

/**
 * Service for handling configurations.
 */
@Injectable()
export class ConfigurationService {
  private readonly serviceRepository: ServiceConfigurationRepository;

  constructor(private readonly connectorService: ConnectorService) {
    this.serviceRepository = new ServiceConfigurationRepository();
  }

  /**
   * Updates the heartbeat of a service replica.
   * If the service or replica does not exist, it adds a new service with the given name and replica ID.
   * @param serviceName - The name of the service.
   * @param replicaId - The ID of the replica.
   */
  heartbeat(serviceName: string, replicaId: string) {
    const service = this.findService(serviceName);
    if (!service) {
      return this.addService(serviceName, replicaId);
    }
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
    // request variable definitions from sidecar
    const { data } =
      await this.connectorService.getConfigFromSidecar(serviceName);

    // iterate over variable definitions and initialise variables and definitions
    Object.entries(data.configuration).forEach(([key, value]) => {
      service.globalVariables.push({
        key: key,
        value: value.defaultValue,
      });
      service.variableDefinitions.push({
        key: key,
        type: value.type,
      });
    });

    this.serviceRepository.create(service);
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
      throw new NotFoundException(`Service '${serviceName}' not found`);
    }
    variables.forEach((variable) => {
      const existingVarIndex = service.globalVariables.findIndex(
        (existingVariable) => existingVariable.key === variable.key,
      );
      if (existingVarIndex > -1) {
        service.globalVariables[existingVarIndex] = variable;
      } else {
        service.globalVariables.push(variable);
      }
    });
    return service;
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
    variables.forEach((variable) => {
      const existingVarIndex = replica.replicaVariables.findIndex(
        (existingVariable) => existingVariable.key === variable.key,
      );
      if (existingVarIndex > -1) {
        replica.replicaVariables[existingVarIndex] = variable;
      } else {
        replica.replicaVariables.push(variable);
      }
    });
    return service;
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
