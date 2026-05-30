import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { HealthCheckResult, HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOkResponse({
    description: 'Service and database are reachable',
    schema: {
      example: { status: 'ok', db: 'connected', timestamp: '2026-05-30T12:34:56.789Z' },
    },
  })
  @ApiServiceUnavailableResponse({
    description: 'Database connection is unavailable',
    schema: {
      example: { status: 'error', db: 'disconnected', timestamp: '2026-05-30T12:34:56.789Z' },
    },
  })
  check(): Promise<HealthCheckResult> {
    return this.healthService.check();
  }
}
