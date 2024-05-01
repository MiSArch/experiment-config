import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';

/**
 * DTO for a configuration event.
 * @property configurations - The updated configurations for different service replicas.
 */
export class ConfigurationDto {
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  configurations: ReplicaConfiguration[];
}

/**
 * DTO for a replica configuration.
 * @property replicaId - The ID of the replica.
 * @property variables - The updated variables for the replica.
 */
export class ReplicaConfiguration {
  @IsString()
  replicaId: string;
  @IsObject()
  variables: Record<string, any>;
}
