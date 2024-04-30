import { IsString } from 'class-validator';

/**
 * DTO for a service replica heartbeat.
 * @property service - The unique name of the service.
 * @property replica - The unique ID of the replica.
 */
export class HeartbeatDto {
  @IsString()
  service: string;
  @IsString()
  replica: string;
}
