import { IsNotEmpty, ValidateNested } from 'class-validator';
import { ConfigurationVariable } from '../entities/service-configuration.entity';

/**
 * DTO for updating multiple configuration variables.
 * @property variables - The updated variables.
 */
export class BatchUpdateVariableDto {
  @IsNotEmpty()
  @ValidateNested()
  variables: ConfigurationVariable[];
}
