import { IsNotEmpty, IsObject } from 'class-validator';

export class VariableDefinitionsDto {
  @IsNotEmpty()
  @IsObject()
  configuration: Record<string, any>;
}
