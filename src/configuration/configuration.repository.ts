import { ServiceConfiguration } from './entities/service-configuration.entity';
/**
 * Repository class for storing services and configurations in memory.
 */
export class ServiceConfigurationRepository {
  private serviceConfigurations: ServiceConfiguration[] = [];

  /**
   * Creates a new service configuration and adds it to the repository.
   * @param serviceConfiguration - The service configuration to be created.
   * @returns The created service configuration.
   */
  public create(
    serviceConfiguration: ServiceConfiguration,
  ): ServiceConfiguration {
    // check if the service configuration already exists (due to race conditions)
    const existingServiceConfiguration = this
      .findByName(serviceConfiguration.name);
    if (!existingServiceConfiguration) {
      this.serviceConfigurations.push(serviceConfiguration);
      return serviceConfiguration;
    }
    // check if it is a new replica
    if (!existingServiceConfiguration.replicas.some(
      (replica) => replica.id === serviceConfiguration.replicas[0].id,
    )) {
      existingServiceConfiguration.replicas.push(
        serviceConfiguration.replicas[0],
      );
    }
    return existingServiceConfiguration;
  }

  /**
   * Finds a service configuration by its service name.
   * @param name - The name of the service for which the configuration should be found.
   * @returns The found service configuration, or undefined if not found.
   */
  public findByName(name: string): ServiceConfiguration | undefined {
    return this.serviceConfigurations.find(
      (serviceConfiguration) => serviceConfiguration.name === name,
    );
  }

  /**
   * Finds all service configurations.
   * @returns All service configurations.
   */
  public findAll(): ServiceConfiguration[] {
    return this.serviceConfigurations;
  }

  /**
   * Updates a service configuration for the provided service name.
   * @param name - The ID of the service configuration to update.
   * @param update - The partial service configuration object with the updated values.
   * @returns The updated service configuration, or undefined if the service configuration was not found.
   */
  public update(
    name: string,
    update: Partial<ServiceConfiguration>,
  ): ServiceConfiguration | undefined {
    const serviceConfiguration = this.findByName(name);
    if (!serviceConfiguration) return undefined;
    Object.assign(serviceConfiguration, update);
    return serviceConfiguration;
  }

  /**
   * Deletes a service configuration with the provided ID.
   * @param name - The name of the service for which the configuration should be deleted.
   * @returns True if the service configuration was successfully deleted, false otherwise.
   */
  public delete(name: string): boolean {
    const initialLength = this.serviceConfigurations.length;
    this.serviceConfigurations = this.serviceConfigurations.filter(
      (serviceConfiguration) => serviceConfiguration.name !== name,
    );
    return this.serviceConfigurations.length < initialLength;
  }
}
