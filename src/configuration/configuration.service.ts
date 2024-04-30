import { Injectable, NotFoundException } from '@nestjs/common';
import { ServiceConfigurationRepository } from './configuration.repository';
import {
  ConfigurationVariable,
  ServiceConfiguration,
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

  heartbeat(serviceName: string, replicaId: string) {
    const service = this.findService(serviceName);
    if (!service) {
      //  get defined variables for new service
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

  addReplica(serviceName: string, replicaId: string): ServiceConfiguration {
    const service = this.findService(serviceName);
    if (!service) {
      throw new NotFoundException(`Service '${serviceName}' not found`);
    }

    // initialise replica with global variables
    const variables: ConfigurationVariable[] = service.globalVariables;
    service.replicas.push({ id: replicaId, replicaVariables: variables });
    return service;
  }

  findAllServices(): ServiceConfiguration[] {
    return this.serviceRepository.findAll();
  }

  findAllServiceNames(): string[] {
    return this.findAllServices().map((service) => service.name);
  }

  findService(name: string) {
    const service = this.serviceRepository.findByName(name);
    if (!service) {
      throw new NotFoundException(`Service '${name}' not found`);
    }
    return service;
  }

  getServiceVariable(serviceName: string, variableKey: string) {
    const service = this.findService(serviceName);
    const variable = service.globalVariables.find(
      (variable) => variable.key === variableKey,
    );
    if (!variable) {
      throw new NotFoundException(`Variable '${variableKey}' not found`);
    }
    return variable;
  }

  findReplica(serviceName: string, replicaId: string) {
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

  getReplicaVariable(
    serviceName: string,
    replicaId: string,
    variableKey: string,
  ) {
    const replica = this.findReplica(serviceName, replicaId);
    const variable = replica.replicaVariables.find(
      (variable) => variable.key === variableKey,
    );
    if (!variable) {
      throw new NotFoundException(`Variable '${variableKey}' not found`);
    }
    return variable;
  }

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

  deleteService(name: string): boolean {
    return this.serviceRepository.delete(name);
  }

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
