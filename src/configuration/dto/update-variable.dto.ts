import { IsNotEmpty } from 'class-validator';

/**
 * DTO for updating a single configuration variable.
 * @property value - The updated value.
 */
export class UpdateVariableDto {
  @IsNotEmpty()
  value: any;
}
