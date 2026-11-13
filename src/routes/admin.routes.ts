import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate, authorizeRoles } from '../middlewares/auth.middleware';
import { adminRateLimiter } from '../middlewares/rateLimiter.middleware';
import { validate } from '../middlewares/validation.middleware';
import {
  adminProductQuerySchema,
  adminUserQuerySchema,
  bulkStatusProductSchema,
  createAdminProductSchema,
  createAdminUserSchema,
  patchAdminProductSchema,
  resetUserPasswordSchema,
  updateAdminProductSchema,
  updateAdminUserSchema,
  updateUserStatusSchema,
} from '../validators/admin.validator';
import { updateOrderStatusSchema } from '../validators/order.validator';

const router = Router();

// ==========================================
// PART 1: ROUTER-WIDE SECURITY
// ==========================================
// Apply strict admin rate limiter, JWT authentication, and Admin RBAC to all admin routes
router.use(adminRateLimiter);
router.use(authenticate);
router.use(authorizeRoles('admin'));

// ==========================================
// DASHBOARD & ANALYTICS
// ==========================================
router.get('/stats', adminController.getDashboardStats.bind(adminController));

// ==========================================
// PART 2: ADMIN PRODUCTS MANAGEMENT
// ==========================================
router.post(
  '/products',
  validate(createAdminProductSchema),
  adminController.createProduct.bind(adminController),
);

router.get(
  '/products',
  validate(adminProductQuerySchema),
  adminController.getProducts.bind(adminController),
);

// Bulk status route placed before /:id parameter to avoid route collisions
router.patch(
  '/products/bulk-status',
  validate(bulkStatusProductSchema),
  adminController.bulkUpdateProductStatus.bind(adminController),
);

router.get('/products/:id', adminController.getProductById.bind(adminController));

router.put(
  '/products/:id',
  validate(updateAdminProductSchema),
  adminController.updateProduct.bind(adminController),
);

router.patch(
  '/products/:id',
  validate(patchAdminProductSchema),
  adminController.patchProduct.bind(adminController),
);

router.delete('/products/:id', adminController.deleteProduct.bind(adminController));

// Pluggable image upload placeholder (marked as TODO for Cloudinary / AWS S3)
router.post('/uploads', adminController.uploadPlaceholder.bind(adminController));

// ==========================================
// PART 3: ADMIN USERS MANAGEMENT
// ==========================================
router.post(
  '/users',
  validate(createAdminUserSchema),
  adminController.createUser.bind(adminController),
);

router.get(
  '/users',
  validate(adminUserQuerySchema),
  adminController.getUsers.bind(adminController),
);

router.get('/users/:id', adminController.getUserById.bind(adminController));

router.put(
  '/users/:id',
  validate(updateAdminUserSchema),
  adminController.updateUser.bind(adminController),
);

router.patch(
  '/users/:id/status',
  validate(updateUserStatusSchema),
  adminController.updateUserStatus.bind(adminController),
);

router.patch(
  '/users/:id/password',
  validate(resetUserPasswordSchema),
  adminController.resetUserPassword.bind(adminController),
);

router.delete('/users/:id', adminController.deleteUser.bind(adminController));

// ==========================================
// ORDERS MANAGEMENT
// ==========================================
router.get('/orders', adminController.getOrders.bind(adminController));

router.patch(
  '/orders/:id/status',
  validate(updateOrderStatusSchema),
  adminController.updateOrderStatus.bind(adminController),
);

export default router;
