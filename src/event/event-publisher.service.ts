import { Injectable, Logger } from '@nestjs/common';
import { DaprClient, CommunicationProtocolEnum } from '@dapr/dapr';

@Injectable()
export class EventPublisherService {
  private readonly daprClient: DaprClient;
  private readonly logger = new Logger(EventPublisherService.name);

  constructor() {
    // Dapr sidecar host
    const daprHost = '127.0.0.1';
    // Dapr sidecar HTTP port
    const daprPort = '3500';
    this.daprClient = new DaprClient({
      daprHost,
      daprPort,
      communicationProtocol: CommunicationProtocolEnum.HTTP,
    });
  }

  /**
   * Publishes an event to a specified topic using the Dapr pubsub component.
   *
   * @param pubsubName - The name of the Dapr pubsub component.
   * @param topic - The topic to which the event will be published.
   * @param data - The data of the event.
   * @returns A promise that resolves when the event is published successfully, or rejects with an error if there was an issue.
   */
  async publishEvent(
    pubsubName: string,
    topic: string,
    data: any,
  ): Promise<void> {
    try {
      await this.daprClient.pubsub.publish(pubsubName, topic, data);
      this.logger.log(`Published event to topic "${topic}"`);
    } catch (error) {
      this.logger.error(`Error publishing event to topic "${topic}": ${error}`);
    }
  }
}
