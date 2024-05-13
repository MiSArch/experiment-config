import { NotFoundException } from '@nestjs/common';
import { ServiceConfiguration } from './entities/service-configuration.entity';

/**
 * Repository class for storing services and configurations in memory using a Map.
 */
export class ServiceConfigurationRepository {
  private serviceConfigurations: Map<string, ServiceConfiguration> = new Map();

  /**
   * Creates a new service configuration and adds it to the repository.
   * @param serviceConfiguration - The service configuration to be created.
   * @throws Error if the service name already exists.
   * @returns The created service configuration.
   */
  public create(serviceConfiguration: ServiceConfiguration): ServiceConfiguration {
    const serviceName = serviceConfiguration.name;
    if (this.serviceConfigurations.has(serviceName)) {
      throw new Error(`Service configuration with name "${serviceName}" already exists.`);
    }
    this.serviceConfigurations.set(serviceName, serviceConfiguration);
    return serviceConfiguration;
  }

  /**
   * Checks if a service configuration with the provided name exists.
   * @param name - The name of the service to check.
   * @returns True if the service configuration exists, false otherwise.
   */
  public exists(name: string): boolean {
    return this.serviceConfigurations.has(name);
  }

  /**
   * Finds a service configuration by its service name.
   * @param name - The name of the service for which the configuration should be found.
   * @returns The found service configuration
   * @throws NotFoundException if the service configuration with the provided name is not found.
   */
  public findByName(name: string): ServiceConfiguration {
    const service = this.serviceConfigurations.get(name);
    if (!service) {
      throw new NotFoundException(`Service configuration with name "${name}" not found.`);
    }
    return service;
  }

  /**
   * Finds all service configurations.
   * @returns All service configurations.
   */
  public findAll(): ServiceConfiguration[] {
    return Array.from(this.serviceConfigurations.values());
  }

  /**
   * Updates a service configuration for the provided service name.
   * @param name - The ID of the service configuration to update.
   * @param update - The partial service configuration object with the updated values.
   * @returns The updated service configuration
   * @throws NotFoundException if the service configuration with the provided name is not found.
   */
  public update(name: string, update: Partial<ServiceConfiguration>): ServiceConfiguration {
    const serviceConfiguration = this.findByName(name);
    if (!serviceConfiguration) {
      throw new NotFoundException(`Service configuration with name "${name}" not found.`);
    };
    Object.assign(serviceConfiguration, update);
    this.serviceConfigurations.set(name, serviceConfiguration);
    return serviceConfiguration;
  }

  /**
   * Deletes a service configuration with the provided ID.
   * @param name - The name of the service for which the configuration should be deleted.
   * @returns True if the service configuration was successfully deleted, false otherwise.
   */
  public delete(name: string): boolean {
    return this.serviceConfigurations.delete(name);
  }
}
