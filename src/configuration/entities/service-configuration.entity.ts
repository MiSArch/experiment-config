import { JSONSchemaType } from 'ajv';

/**
 * Represents a configuration variable.
 * @property key - The key of the configuration variable.
 * @property value - The current value of the configuration variable.
 */
export interface ConfigurationVariable {
  key: string;
  value: any;
}

/**
 * Represents the schema of a configuration variable.
 * @property key - The key of the configuration variable.
 * @property schema - The JSON type of the configuration variable.
 */
export interface ConfigurationVariableDefinition {
  key: string;
  type: JSONSchemaType<any>;
  defaultValue: any;
}

/**
 * Represents a service replica configuration.
 * @property id - The ID of the service replica.
 * @property replicaVariables - The configuration variables of the service replica.
 * local variables override the global service variables.
 */
export interface ServiceReplica {
  id: string;
  replicaVariables: ConfigurationVariable[];
  lastSeen?: Date;
}

/**
 * Represents a service configuration.
 * @property name - The name of the service.
 * @property replicas - The replicas of the service.
 * @property globalVariables - globally set configuration variables for all replicas.
 * The global variables are initialised with the default values from the variable definitions.
 */
export interface ServiceConfiguration {
  name: string;
  replicas: ServiceReplica[];
  globalVariables: ConfigurationVariable[];
  variableDefinitions: ConfigurationVariableDefinition[];
}
