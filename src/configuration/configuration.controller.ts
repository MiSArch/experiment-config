import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ConfigurationService } from './configuration.service';
import { ConfigurationVariable } from './entities/service-configuration.entity';
import { UpdateVariableDto } from './dto/update-variable.dto';
import { BatchUpdateVariableDto } from './dto/batch-update-variables.dto';

/**
 * Controller for handling configurations.
 */
@Controller('configuration')
export class ConfigurationController {
  constructor(private readonly configurationService: ConfigurationService) {}

  @Get()
  getAllServices() {
    return this.configurationService.findAllServices();
  }

  @Get('names')
  getAllServiceNames() {
    return this.configurationService.findAllServiceNames();
  }

  @Get(':service/defined-variables')
  getServiceDefinedVariables(@Param('service') serviceName: string) {
    return this.configurationService.findService(serviceName)
      ?.variableDefinitions;
  }

  @Get(':service/variables')
  getServiceVariables(@Param('service') serviceName: string) {
    return this.configurationService.findService(serviceName)?.globalVariables;
  }

  @Get(':service/replicas')
  getServiceReplicas(@Param('service') serviceName: string) {
    return this.configurationService.findService(serviceName)?.replicas;
  }

  @Put(':service/variables')
  updateServiceVariables(
    @Param('service') serviceName: string,
    @Body() batchUpdateDto: BatchUpdateVariableDto,
  ) {
    return this.configurationService.batchAddOrUpdateServiceVariables(
      serviceName,
      batchUpdateDto.variables,
    );
  }

  @Get(':service/variables/:variable')
  getServiceVariable(
    @Param('service') serviceName: string,
    @Param('variable') variableKey: string,
  ) {
    return this.configurationService.getServiceVariable(
      serviceName,
      variableKey,
    );
  }

  @Put(':service/variables/:variable')
  updateServiceVariable(
    @Param('service') serviceName: string,
    @Param('variable') variableKey: string,
    @Body() updateDto: UpdateVariableDto,
  ) {
    const updatedVariable: ConfigurationVariable = {
      key: variableKey,
      value: updateDto.value,
    };
    return this.configurationService.batchAddOrUpdateServiceVariables(
      serviceName,
      [updatedVariable],
    );
  }

  @Get(':service/replicas/:replica/variables')
  getReplicaVariables(
    @Param('service') serviceName: string,
    @Param('replica') replicaId: string,
  ) {
    return this.configurationService.findReplica(serviceName, replicaId)
      ?.replicaVariables;
  }

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

  @Get(':service/replicas/:replica/variables/:variable')
  getReplicaVariable(
    @Param('service') serviceName: string,
    @Param('replica') replicaId: string,
    @Param('variable') variableKey: string,
  ) {
    return this.configurationService.getReplicaVariable(
      serviceName,
      replicaId,
      variableKey,
    );
  }

  @Put(':service/replicas/:replica/variables/:variable')
  updateReplicaVariable(
    @Param('service') serviceName: string,
    @Param('replica') replicaId: string,
    @Param('variable') variableKey: string,
    @Body() updateDto: UpdateVariableDto,
  ) {
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
