import { JSONSchemaType } from 'ajv';
import { IsNotEmpty, IsObject } from 'class-validator';

/**
 * DTO for requested variable definitions from a service sidecar.
 * @property configuration - The configuration variables.
 */
export class VariableDefinitionsDto {
  @IsNotEmpty()
  @IsObject()
  configuration: Record<
    string,
    { type: JSONSchemaType<any>; defaultValue: any }
  >;
}
