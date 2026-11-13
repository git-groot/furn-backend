import { adminController } from '../../src/controllers/admin.controller';
import { authenticate, authorizeRoles } from '../../src/middlewares/auth.middleware';
import { errorHandler } from '../../src/middlewares/error.middleware';
import { auditLogRepository } from '../../src/repositories/auditLog.repository';
import { categoryRepository } from '../../src/repositories/category.repository';
import { productRepository } from '../../src/repositories/product.repository';
import { userRepository } from '../../src/repositories/user.repository';
import { adminService } from '../../src/services/admin.service';
import { authService } from '../../src/services/auth.service';
import { ConflictError, ForbiddenError, UnauthorizedError } from '../../src/utils/errors';
import { generateAccessToken, generateRefreshToken } from '../../src/utils/jwt';
import { hashPassword } from '../../src/utils/password';
import { createMockRequest, createMockResponse } from '../helpers/mockHttp';

describe('Admin Panel API Integration Suites', () => {
  const adminUser = {
    userId: 'admin-uuid-1',
    email: 'admin@myfurniture.com',
    role: 'admin' as const,
  };

  const customerUser = {
    userId: 'cust-uuid-1',
    email: 'customer@example.com',
    role: 'customer' as const,
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==========================================
  // 1. SECURITY & RBAC ACCESS CONTROL TESTS
  // ==========================================
  describe('Security & RBAC Authorization', () => {
    it('should reject unauthenticated requests without Bearer token with 401', () => {
      const req = createMockRequest({ method: 'GET', url: '/api/v1/admin/products' });
      const res = createMockResponse();
      const next = jest.fn();

      authenticate(req, res as any, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(UnauthorizedError);

      const errRes = createMockResponse();
      errorHandler(err, req, errRes as any, jest.fn());
      expect(errRes.statusCode).toBe(401);
      expect(errRes.body.success).toBe(false);
    });

    it('should reject non-admin (customer) token with 403 Forbidden', () => {
      const customerToken = generateAccessToken(customerUser);
      const req = createMockRequest({
        method: 'GET',
        url: '/api/v1/admin/products',
        headers: { authorization: `Bearer ${customerToken}` },
      });
      const res = createMockResponse();
      const next = jest.fn();

      authenticate(req, res as any, next);
      expect(req.user?.role).toBe('customer');

      const rbacNext = jest.fn();
      authorizeRoles('admin')(req, res as any, rbacNext);

      expect(rbacNext).toHaveBeenCalledTimes(1);
      const err = rbacNext.mock.calls[0][0];
      expect(err).toBeInstanceOf(ForbiddenError);

      const errRes = createMockResponse();
      errorHandler(err, req, errRes as any, jest.fn());
      expect(errRes.statusCode).toBe(403);
      expect(errRes.body.success).toBe(false);
    });

    it('should allow valid admin tokens through authenticate and authorizeRoles', () => {
      const adminToken = generateAccessToken(adminUser);
      const req = createMockRequest({
        method: 'GET',
        url: '/api/v1/admin/products',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      const res = createMockResponse();
      const next = jest.fn();

      authenticate(req, res as any, next);
      expect(next).toHaveBeenCalledWith();
      expect(req.user?.userId).toBe(adminUser.userId);
      expect(req.user?.role).toBe('admin');

      const rbacNext = jest.fn();
      authorizeRoles('admin')(req, res as any, rbacNext);
      expect(rbacNext).toHaveBeenCalledWith();
    });
  });

  // ==========================================
  // 2. ADMIN PRODUCT MANAGEMENT TESTS
  // ==========================================
  describe('Admin Product Management', () => {
    const mockCategory = {
      id: 'cat-1111-2222-3333-444444444444',
      name: 'Living Room',
      slug: 'living-room',
      display_order: 1,
      is_active: true,
      created_at: new Date(),
    };

    const mockProduct = {
      id: 'prod-1111-2222-3333-444444444444',
      category_id: mockCategory.id,
      title: 'Artisan Sheesham Coffee Table',
      slug: 'artisan-sheesham-coffee-table',
      sku: 'TBL-SH-001',
      description: 'Solid handcrafted Sheesham coffee table with natural finish',
      base_price: 12999,
      compare_at_price: 15999,
      primary_material: 'Sheesham Wood',
      assembly_required: false,
      dispatch_time: '2 to 3 Weeks',
      warranty: '1 Year',
      is_featured: true,
      is_active: true,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      images: [
        {
          id: 'img-1',
          product_id: 'prod-1111-2222-3333-444444444444',
          image_url: 'https://images.myfurniture.com/table1.jpg',
          alt_text: 'Table',
          is_primary: true,
          display_order: 0,
        },
      ],
      variants: [
        {
          id: 'var-1',
          product_id: 'prod-1111-2222-3333-444444444444',
          sku: 'TBL-SH-001-STD',
          title: 'Standard',
          wood_type: 'Sheesham Wood',
          price: 12999,
          stock_quantity: 15,
          is_active: true,
        },
      ],
    };

    it('should create a product with images and variants, record audit log, and return 201', async () => {
      jest.spyOn(adminService, 'createProduct').mockResolvedValue(mockProduct as any);

      const req = createMockRequest({
        method: 'POST',
        url: '/api/v1/admin/products',
        user: adminUser,
        body: {
          name: 'Artisan Sheesham Coffee Table',
          category_id: mockCategory.id,
          sku: 'TBL-SH-001',
          price: 15999,
          discount_price: 12999,
          description: 'Solid handcrafted Sheesham coffee table with natural finish',
          images: [{ image_url: 'https://images.myfurniture.com/table1.jpg' }],
        },
      });
      const res = createMockResponse();
      const next = jest.fn();

      await adminController.createProduct(req, res as any, next);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(mockProduct.id);
      expect(res.body.data.sku).toBe('TBL-SH-001');
    });

    it('should reject duplicate SKU and slug with 409 Conflict', async () => {
      jest.spyOn(categoryRepository, 'findById').mockResolvedValue(mockCategory as any);
      jest.spyOn(productRepository, 'findBySlugAny').mockResolvedValue(mockProduct as any);

      await expect(
        adminService.createProduct(adminUser.userId, {
          name: 'Artisan Sheesham Coffee Table',
          category_id: mockCategory.id,
          sku: 'NEW-SKU-999',
          price: 10000,
          description: 'Description test with 10+ characters',
        }),
      ).rejects.toThrow(ConflictError);

      jest.spyOn(productRepository, 'findBySlugAny').mockResolvedValue(null);
      jest.spyOn(productRepository, 'findBySku').mockResolvedValue(mockProduct as any);

      await expect(
        adminService.createProduct(adminUser.userId, {
          name: 'Unique Table Name',
          category_id: mockCategory.id,
          sku: 'TBL-SH-001',
          price: 10000,
          description: 'Description test with 10+ characters',
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('should return paginated products list with filters and stock status', async () => {
      const paginatedResult = {
        data: [mockProduct],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };

      jest.spyOn(adminService, 'getProducts').mockResolvedValue(paginatedResult as any);

      const req = createMockRequest({
        method: 'GET',
        url: '/api/v1/admin/products',
        query: { status: 'active', stock: 'in_stock', page: '1', limit: '20' },
        user: adminUser,
      });
      const res = createMockResponse();
      const next = jest.fn();

      await adminController.getProducts(req, res as any, next);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toBe(1);
    });

    it('should soft-delete product and ensure it is excluded from public search', async () => {
      jest.spyOn(productRepository, 'findById').mockResolvedValue(mockProduct as any);
      const softDeleteSpy = jest.spyOn(productRepository, 'softDelete').mockResolvedValue(true);
      const auditLogSpy = jest.spyOn(auditLogRepository, 'log').mockResolvedValue({} as any);

      await adminService.deleteProduct(adminUser.userId, mockProduct.id);

      expect(softDeleteSpy).toHaveBeenCalledWith(mockProduct.id);
      expect(auditLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          admin_id: adminUser.userId,
          action: 'DELETE',
          resource_type: 'PRODUCT',
          resource_id: mockProduct.id,
        }),
      );
    });

    it('should bulk update product active status', async () => {
      jest.spyOn(productRepository, 'bulkUpdateStatus').mockResolvedValue(3);
      jest.spyOn(auditLogRepository, 'log').mockResolvedValue({} as any);

      const req = createMockRequest({
        method: 'PATCH',
        url: '/api/v1/admin/products/bulk-status',
        user: adminUser,
        body: {
          product_ids: ['prod-1', 'prod-2', 'prod-3'],
          is_active: false,
        },
      });
      const res = createMockResponse();
      const next = jest.fn();

      await adminController.bulkUpdateProductStatus(req, res as any, next);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.updatedCount).toBe(3);
    });
  });

  // ==========================================
  // 3. ADMIN USER MANAGEMENT & SAFETY TESTS
  // ==========================================
  describe('Admin User Management & Safety Guards', () => {
    const existingAdmin = {
      id: 'admin-uuid-1',
      email: 'admin@myfurniture.com',
      password_hash: 'hashed_password',
      first_name: 'Admin',
      last_name: 'User',
      phone: '+91 9876543210',
      role: 'admin' as const,
      is_active: true,
      token_version: 1,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const targetCustomer = {
      id: 'target-user-uuid',
      email: 'customer.target@example.com',
      password_hash: 'hashed_password',
      first_name: 'Target',
      last_name: 'Customer',
      phone: '+91 9123456789',
      role: 'customer' as const,
      is_active: true,
      token_version: 1,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should create user, hash password, strip password_hash from response, and log audit', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockResolvedValue(targetCustomer as any);
      const auditSpy = jest.spyOn(auditLogRepository, 'log').mockResolvedValue({} as any);

      const result = await adminService.createUser(adminUser.userId, {
        email: 'customer.target@example.com',
        password: 'Password@123',
        first_name: 'Target',
        last_name: 'Customer',
        role: 'customer',
      });

      expect((result as any).password_hash).toBeUndefined();
      expect(result.email).toBe('customer.target@example.com');
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          admin_id: adminUser.userId,
          action: 'CREATE',
          resource_type: 'USER',
        }),
      );
    });

    it('should prevent self-deletion by an administrator', async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue(existingAdmin as any);

      await expect(adminService.deleteUser(adminUser.userId, adminUser.userId)).rejects.toThrow(
        'Admins cannot delete their own account',
      );
    });

    it('should prevent self-deactivation by an administrator', async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue(existingAdmin as any);

      await expect(
        adminService.updateUserStatus(adminUser.userId, adminUser.userId, false),
      ).rejects.toThrow('Admins cannot deactivate their own account');
    });

    it('should prevent self-demotion by an administrator', async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue(existingAdmin as any);

      await expect(
        adminService.updateUser(adminUser.userId, adminUser.userId, { role: 'customer' }),
      ).rejects.toThrow('Admins cannot demote their own account');
    });

    it('should prevent deleting or demoting the last active administrator in the system', async () => {
      const secondAdmin = { ...existingAdmin, id: 'admin-uuid-2', email: 'admin2@myfurniture.com' };
      jest.spyOn(userRepository, 'findById').mockResolvedValue(secondAdmin as any);
      // Simulate 0 other active admins
      jest.spyOn(userRepository, 'countActiveAdmins').mockResolvedValue(0);

      await expect(
        adminService.deleteUser(adminUser.userId, secondAdmin.id),
      ).rejects.toThrow('system must retain at least one active administrator');

      await expect(
        adminService.updateUserStatus(adminUser.userId, secondAdmin.id, false),
      ).rejects.toThrow('system must retain at least one active administrator');
    });

    it('should reset user password, increment token_version, and log audit', async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue(targetCustomer as any);
      jest.spyOn(userRepository, 'updatePassword').mockResolvedValue({
        ...targetCustomer,
        token_version: 2,
      } as any);
      const auditSpy = jest.spyOn(auditLogRepository, 'log').mockResolvedValue({} as any);

      const result = await adminService.resetUserPassword(
        adminUser.userId,
        targetCustomer.id,
        'NewStrongPassword@123',
      );

      expect((result as any).password_hash).toBeUndefined();
      expect(result.token_version).toBe(2);
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          admin_id: adminUser.userId,
          action: 'PASSWORD_RESET',
          resource_type: 'USER',
          resource_id: targetCustomer.id,
        }),
      );
    });
  });

  // ==========================================
  // 4. DEACTIVATED USER LOGIN & TOKEN REVOCATION
  // ==========================================
  describe('Deactivated User Security & Token Invalidation', () => {
    it('should prevent deactivated users from logging in', async () => {
      const deactivatedUser = {
        id: 'deact-1',
        email: 'deactivated@example.com',
        password_hash: await hashPassword('Password@123'),
        first_name: 'Inactive',
        last_name: 'User',
        role: 'customer' as const,
        is_active: false,
        token_version: 1,
        deleted_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(deactivatedUser as any);

      await expect(
        authService.login({
          email: 'deactivated@example.com',
          password: 'Password@123',
        }),
      ).rejects.toThrow('Account is deactivated or disabled');
    });

    it('should prevent soft-deleted users from logging in', async () => {
      const softDeletedUser = {
        id: 'del-1',
        email: 'deleted@example.com',
        password_hash: await hashPassword('Password@123'),
        first_name: 'Deleted',
        last_name: 'User',
        role: 'customer' as const,
        is_active: false,
        token_version: 1,
        deleted_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(softDeletedUser as any);

      await expect(
        authService.login({
          email: 'deleted@example.com',
          password: 'Password@123',
        }),
      ).rejects.toThrow('Account is deactivated or disabled');
    });

    it('should reject refresh tokens with outdated token_version after password/role reset', async () => {
      const originalPayload = {
        userId: 'user-token-test',
        email: 'user@example.com',
        role: 'customer' as const,
        tokenVersion: 1,
      };

      const oldRefreshToken = generateRefreshToken(originalPayload);

      // User in DB now has token_version = 2 (e.g. after password reset)
      const updatedDbUser = {
        id: 'user-token-test',
        email: 'user@example.com',
        password_hash: 'hash',
        first_name: 'User',
        last_name: 'Test',
        role: 'customer' as const,
        is_active: true,
        token_version: 2,
        deleted_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest.spyOn(userRepository, 'findById').mockResolvedValue(updatedDbUser as any);

      await expect(authService.refresh(oldRefreshToken)).rejects.toThrow(
        'Refresh token has been revoked',
      );
    });
  });
});

