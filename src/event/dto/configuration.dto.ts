import { JSONSchemaType } from 'ajv';
import { IsObject } from 'class-validator';

/**
 * DTO for a replica configuration event.
 * @property configuration - The updated configuration for the replica.
 */
export class ConfigurationDto {
  @IsObject()
  configuration: Record<
    string,
    { type: JSONSchemaType<any>; defaultValue: any }
  >;
}
