import { IsNotEmpty } from 'class-validator';

export class UpdateVariableDto {
  @IsNotEmpty()
  value: any;
}
