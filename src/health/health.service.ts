import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface HealthCheckResult {
  status: 'ok';
  db: 'connected';
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(private readonly dataSource: DataSource) {}

  async check(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();

    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok', db: 'connected', timestamp };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        db: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
