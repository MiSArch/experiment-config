import { Body, Controller, Get, Logger, Post } from '@nestjs/common';
import { EventService } from './events.service';
import { HeartbeatDto } from './dto/heartbeat.dto';

/**
 * Controller for handling events.
 */
@Controller()
export class EventController {
  constructor(
    private readonly eventService: EventService,
    private readonly logger: Logger,
  ) {}

  /**
   * Subscribes to heartbeat events of all service replicas.
   *
   * @returns A promise that resolves to an array of objects containing the pubsubName, topic, and route.
   */
  @Get('/dapr/subscribe')
  async subscribe(): Promise<any> {
    return [
      {
        pubsubName: 'experiment-config-pubsub',
        topic: 'heartbeat',
        route: 'heartbeat',
      },
    ];
  }

  /**
   * Endpoint for order validation successfull events from the discount service.
   *
   * @param body - The event data received from Dapr.
   * @returns A promise that resolves to void.
   */
  @Post('heartbeat')
  async processHeartbeat(@Body('data') event: HeartbeatDto): Promise<void> {
    // Extract the order context from the event
    const { serviceName, replicaId } = event;

    this.eventService.heartbeat(serviceName, replicaId);
  }
}
