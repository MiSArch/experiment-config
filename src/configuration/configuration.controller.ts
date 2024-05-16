import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ConfigurationService } from './configuration.service';
import {
  ConfigurationVariable,
  ConfigurationVariableDefinition,
  ServiceConfiguration,
  ServiceReplica,
} from './entities/service-configuration.entity';
import { UpdateVariableDto } from './dto/update-variable.dto';
import { BatchUpdateVariableDto } from './dto/batch-update-variables.dto';

/**
 * Controller for handling configurations.
 */
@Controller('configuration')
export class ConfigurationController {
  /**
   * Creates an instance of the ConfigurationController class.
   * @param configurationService The configuration service.
   */
  constructor(private readonly configurationService: ConfigurationService) {}

  /**
   * HTTP Endpoint to get all service configurations.
   * @returns All services configurations.
   */
  @Get()
  getAllServices(): ServiceConfiguration[] {
    return this.configurationService.findAllServices();
  }

  /**
   * HTTP Endpoint to get all service names.
   * @returns All service names.
   */
  @Get('names')
  getAllServiceNames(): string[] {
    return this.configurationService.findAllServiceNames();
  }

  /**
   * HTTP Endpoint to get one service configurations.
   * @param serviceName The name of the service.
   * @returns The service configurations.
   */
  @Get(':service/defined-variables')
  getServiceDefinedVariables(
    @Param('service') serviceName: string,
  ): ConfigurationVariableDefinition[] {
    return this.configurationService.findService(serviceName)
      ?.variableDefinitions;
  }

  /**
   * HTTP Endpoint to get all variables for a service.
   * @param serviceName The name of the service.
   * @returns All variables for the service.
   */
  @Get(':service/variables')
  getServiceVariables(
    @Param('service') serviceName: string,
  ): ConfigurationVariable[] {
    return this.configurationService.findService(serviceName)?.globalVariables;
  }

  /**
   * HTTP Endpoint to get all replica configurations of a service.
   * @param serviceName The name of the service.
   * @returns The replicas configurations.
   */
  @Get(':service/replicas')
  getServiceReplicas(@Param('service') serviceName: string): ServiceReplica[] {
    return this.configurationService.findService(serviceName)?.replicas;
  }

  /**
   * HTTP Endpoint to update the variables for a specific service.
   * @param serviceName - The name of the service.
   * @param batchUpdateDto - The DTO containing the variables to be updated.
   * @returns The updated service configuration.
   */
  @Put(':service/variables')
  updateServiceVariables(
    @Param('service') serviceName: string,
    @Body() batchUpdateDto: BatchUpdateVariableDto,
  ): ServiceConfiguration {
    return this.configurationService.batchAddOrUpdateServiceVariables(
      serviceName,
      batchUpdateDto.variables,
    );
  }

  /**
   * HTTP Endpoint to retrieve the value of a variable for a specific service.
   * @param serviceName - The name of the service.
   * @param variableKey - The key of the variable.
   * @returns The configuration variable.
   */
  @Get(':service/variables/:variable')
  getServiceVariable(
    @Param('service') serviceName: string,
    @Param('variable') variableKey: string,
  ): ConfigurationVariable {
    return this.configurationService.getServiceVariable(
      serviceName,
      variableKey,
    );
  }

  /**
   * HTTP Endpoint to update the value of a variable for a specific service.
   * @param serviceName - The name of the service.
   * @param variableKey - The key of the variable.
   * @param updateDto - The DTO containing the updated value.
   * @returns The updated service configuration.
   */
  @Put(':service/variables/:variable')
  updateServiceVariable(
    @Param('service') serviceName: string,
    @Param('variable') variableKey: string,
    @Body() updateDto: UpdateVariableDto,
  ): ServiceConfiguration {
    const updatedVariable: ConfigurationVariable = {
      key: variableKey,
      value: updateDto.value,
    };
    return this.configurationService.batchAddOrUpdateServiceVariables(
      serviceName,
      [updatedVariable],
    );
  }

  /**
   * HTTP Endpoint to get all variables for a specific replica.
   * @param serviceName - The name of the service.
   * @param replicaId - The ID of the replica.
   * @returns All variables for the replica.
   */
  @Get(':service/replicas/:replica/variables')
  getReplicaVariables(
    @Param('service') serviceName: string,
    @Param('replica') replicaId: string,
  ): ConfigurationVariable[] {
    return this.configurationService.findReplica(serviceName, replicaId)
      ?.replicaVariables;
  }

  /**
   * HTTP Endpoint to update multiple variables for a specific replica.
   * @param serviceName - The name of the service.
   * @param replicaId - The ID of the replica.
   * @param batchUpdateDto - The DTO containing the variables to be updated.
   * @returns The updated replica configuration.
   */
  @Put(':service/replicas/:replica/variables')
  updateReplicaVariables(
    @Param('service') serviceName: string,
    @Param('replica') replicaId: string,
    @Body() batchUpdateDto: BatchUpdateVariableDto,
  ) {
    return this.configurationService.batchAddOrUpdateReplicaVariables(
      serviceName,
      replicaId,
      batchUpdateDto.variables,
    );
  }

  /**
   * HTTP Endpoint to get a specific variable for a specific replica.
   * @param serviceName - The name of the service.
   * @param replicaId - The ID of the replica.
   * @param variableKey - The key of the variable.
   * @returns The configuration variable.
   */
  @Get(':service/replicas/:replica/variables/:variable')
  getReplicaVariable(
    @Param('service') serviceName: string,
    @Param('replica') replicaId: string,
    @Param('variable') variableKey: string,
  ): ConfigurationVariable {
    return this.configurationService.getReplicaVariable(
      serviceName,
      replicaId,
      variableKey,
    );
  }

  /**
   * HTTP Endpoint to update a specific variable for a specific replica.
   * @param serviceName - The name of the service.
   * @param replicaId - The ID of the replica.
   * @param variableKey - The key of the variable.
   * @param updateDto - The DTO containing the updated value.
   * @returns The updated replica configuration.
   */
  @Put(':service/replicas/:replica/variables/:variable')
  updateReplicaVariable(
    @Param('service') serviceName: string,
    @Param('replica') replicaId: string,
    @Param('variable') variableKey: string,
    @Body() updateDto: UpdateVariableDto,
  ): ServiceConfiguration {
    const updatedVariable: ConfigurationVariable = {
      key: variableKey,
      value: updateDto.value,
    };
    return this.configurationService.batchAddOrUpdateReplicaVariables(
      serviceName,
      replicaId,
      [updatedVariable],
    );
  }
}
