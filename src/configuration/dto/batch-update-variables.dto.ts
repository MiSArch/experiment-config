import { IsNotEmpty, ValidateNested } from 'class-validator';
import { ConfigurationVariable } from '../entities/service-configuration.entity';

export class BatchUpdateVariableDto {
  @IsNotEmpty()
  @ValidateNested()
  variables: ConfigurationVariable[];
}
