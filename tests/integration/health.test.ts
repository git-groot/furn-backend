import { db } from '../../src/config/database';
import { healthController } from '../../src/controllers/health.controller';
import { createMockRequest, createMockResponse } from '../helpers/mockHttp';

describe('Health and System Endpoints', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('GET /health should return system status healthy when DB SELECT 1 succeeds', async () => {
    jest.spyOn(db, 'query').mockResolvedValue({
      rows: [{ health: 1 }],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: [],
    });

    const req = createMockRequest({ method: 'GET', url: '/health' });
    const res = createMockResponse();

    await healthController.getHealth(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.database.connected).toBe(true);
    expect(res.body.data.database.provider).toBe('Neon Serverless PostgreSQL');
    expect(res.body.data.service).toBe('myfurniture-backend');
  });

  it('GET /health should return 503 degraded when DB connection or query fails', async () => {
    jest.spyOn(db, 'query').mockRejectedValue(new Error('Connection timeout'));

    const req = createMockRequest({ method: 'GET', url: '/health' });
    const res = createMockResponse();

    await healthController.getHealth(req, res as any);

    expect(res.statusCode).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.data.status).toBe('degraded');
    expect(res.body.data.database.connected).toBe(false);
  });
});
