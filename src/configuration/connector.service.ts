import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { ConfigurationDto } from 'src/event/dto/configuration.dto';

/**
 * Service for connecting to individual service sidecars.
 */
@Injectable()
export class ConnectorService {
  constructor(
    private readonly logger: Logger,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Request the variable definitions from the specified sidecar.
   * @param service The service to send the request to.
   * @returns An Observable that emits the AxiosResponse object.
   */
  async getConfigFromSidecar(
    service: string,
  ): Promise<AxiosResponse<ConfigurationDto>> {
    try {
      const response = (await this.httpService
        .get(`http://localhost:3500/${service}/'_ecs/defined-variables'`)
        .toPromise()) as AxiosResponse<ConfigurationDto>;

      if (response && response.status !== 200) {
        this.logger.error(
          `Variable Request to ${service}-sidecar's failed with status ${response.status}`,
        );
      }
      return response;
    } catch (error) {
      this.logger.error(
        `Error sending variable request to ${service}-sidecar:`,
        error,
      );
      throw error;
    }
  }
}
