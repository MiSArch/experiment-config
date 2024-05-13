import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { VariableDefinitionsDto } from './dto/variable-definitions.dto';

/**
 * Service for connecting to individual service sidecars.
 */
@Injectable()
export class ConnectorService {
  private baseUrl:string = 'http://localhost:3500/v1.0/invoke';
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
  ): Promise<AxiosResponse<VariableDefinitionsDto>> {
    try {
      const response = (await this.httpService
        .get(`${this.baseUrl}/${service}/method/_ecs/defined-variables`)
        .toPromise()) as AxiosResponse<VariableDefinitionsDto>;

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
