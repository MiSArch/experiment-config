import { IsString } from 'class-validator';

/**
 * DTO for a service replica heartbeat.
 * @property ServiceName - The unique name of the service.
 * @property ReplicaId - The unique ID of the replica.
 */
export class HeartbeatDto {
  @IsString()
  serviceName: string;
  @IsString()
  replicaId: string;
}
