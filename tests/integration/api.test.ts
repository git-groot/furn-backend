import { swaggerDocument } from '../../src/config/swagger';
import { authController } from '../../src/controllers/auth.controller';
import { categoryController } from '../../src/controllers/category.controller';
import { errorHandler } from '../../src/middlewares/error.middleware';
import { authService } from '../../src/services/auth.service';
import { categoryService } from '../../src/services/category.service';
import { UnauthorizedError } from '../../src/utils/errors';
import { createMockRequest, createMockResponse } from '../helpers/mockHttp';

describe('API Controller and Middleware Integration Flows', () => {
  describe('Auth Controller Flows', () => {
    it('register should delegate to authService and send 201 response', async () => {
      const mockResult = {
        accessToken: 'access_mock_token',
        refreshToken: 'refresh_mock_token',
        user: {
          id: 'u-1',
          email: 'jane@example.com',
          first_name: 'Jane',
          last_name: 'Doe',
          role: 'customer' as const,
          is_active: true,
          token_version: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
      };

      jest.spyOn(authService, 'register').mockResolvedValue(mockResult);

      const req = createMockRequest({
        method: 'POST',
        url: '/api/v1/auth/register',
        body: {
          email: 'jane@example.com',
          password: 'Password@123',
          first_name: 'Jane',
          last_name: 'Doe',
        },
      });
      const res = createMockResponse();
      const next = jest.fn();

      await authController.register(req, res as any, next);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBe('access_mock_token');
      expect(res.body.data.user.email).toBe('jane@example.com');
    });

    it('login should forward errors to next for centralized error handling', async () => {
      jest
        .spyOn(authService, 'login')
        .mockRejectedValue(new UnauthorizedError('Invalid email or password'));

      const req = createMockRequest({
        method: 'POST',
        url: '/api/v1/auth/login',
        body: { email: 'wrong@example.com', password: 'wrong' },
      });
      const res = createMockResponse();
      const next = jest.fn();

      await authController.login(req, res as any, next);

      expect(next).toHaveBeenCalledTimes(1);
      const passedError = next.mock.calls[0][0];
      expect(passedError).toBeInstanceOf(UnauthorizedError);

      // Verify centralized errorHandler produces standardized JSON response
      const errRes = createMockResponse();
      errorHandler(passedError, req, errRes as any, jest.fn());

      expect(errRes.statusCode).toBe(401);
      expect(errRes.body.success).toBe(false);
      expect(errRes.body.message).toBe('Invalid email or password');
    });
  });

  describe('Category Controller Flows', () => {
    it('getAll should return category list', async () => {
      const mockCategories = [
        {
          id: 'cat-1',
          name: 'Living Room',
          slug: 'living-room',
          display_order: 1,
          is_active: true,
          created_at: new Date(),
          subcategories: [],
        },
      ];

      jest.spyOn(categoryService, 'getAll').mockResolvedValue(mockCategories);

      const req = createMockRequest({ method: 'GET', url: '/api/v1/categories' });
      const res = createMockResponse();
      const next = jest.fn();

      await categoryController.getAll(req, res as any, next);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockCategories);
    });
  });

  describe('OpenAPI Documentation Metadata', () => {
    it('Swagger document should define OpenAPI 3.0 specification', () => {
      expect(swaggerDocument.openapi).toBe('3.0.0');
      expect(swaggerDocument.info.title).toBe('MyFurniture REST API');
      expect(swaggerDocument.paths['/auth/register']).toBeDefined();
      expect(swaggerDocument.paths['/products']).toBeDefined();
      expect(swaggerDocument.paths['/cart']).toBeDefined();
      expect(swaggerDocument.paths['/orders']).toBeDefined();
    });
  });
});
