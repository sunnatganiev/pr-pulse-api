import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService, { provide: DataSource, useValue: dataSource }],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  describe('check', () => {
    it('returns ok shape when database query succeeds', async () => {
      dataSource.query.mockResolvedValueOnce([{ '?column?': 1 }]);

      const result = await service.check();

      expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
      expect(result).toEqual({
        status: 'ok',
        db: 'connected',
        timestamp: expect.any(String),
      });
      expect(() => new Date(result.timestamp).toISOString()).not.toThrow();
    });

    it('throws ServiceUnavailableException with disconnected shape when query fails', async () => {
      dataSource.query.mockRejectedValueOnce(new Error('connection refused'));

      await expect(service.check()).rejects.toThrow(ServiceUnavailableException);

      try {
        await service.check();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceUnavailableException);
        const response = (err as ServiceUnavailableException).getResponse();
        expect(response).toEqual({
          status: 'error',
          db: 'disconnected',
          timestamp: expect.any(String),
        });
      }
    });
  });
});
