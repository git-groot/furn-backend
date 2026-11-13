import { NextFunction, Request, Response } from 'express';
import { adminService } from '../services/admin.service';
import { storageService } from '../services/storage.service';
import { sendCreated, sendPaginated, sendSuccess } from '../utils/response';

export class AdminController {
  // ==========================================
  // PART 2: PRODUCT CONTROLLERS
  // ==========================================

  async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.userId;
      const product = await adminService.createProduct(adminId, req.body);
      sendCreated(res, product, 'Product created successfully');
    } catch (error) {
      next(error);
    }
  }

  async getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const products = await adminService.getProducts(req.query as any);
      sendPaginated(res, products, 'Products retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await adminService.getProductById(req.params.id as string);
      sendSuccess(res, product, 'Product retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.userId;
      const product = await adminService.updateProduct(adminId, req.params.id as string, req.body);
      sendSuccess(res, product, 'Product updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async patchProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.userId;
      const product = await adminService.patchProduct(adminId, req.params.id as string, req.body);
      sendSuccess(res, product, 'Product patched successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.userId;
      await adminService.deleteProduct(adminId, req.params.id as string);
      sendSuccess(res, null, 'Product deleted successfully (soft-deleted)');
    } catch (error) {
      next(error);
    }
  }

  async bulkUpdateProductStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.userId;
      const { product_ids, is_active } = req.body;
      const result = await adminService.bulkUpdateProductStatus(adminId, product_ids, is_active);
      sendSuccess(res, result, `Updated status for ${result.updatedCount} products`);
    } catch (error) {
      next(error);
    }
  }

  async uploadPlaceholder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // TODO: Connect Cloudinary / AWS S3 multipart form parser in production
      const fileName = (req.body?.filename as string) || 'artisan-furniture-sample.jpg';
      const fileUrl = await storageService.uploadFile({
        filename: fileName,
        mimetype: 'image/jpeg',
      });

      sendCreated(
        res,
        {
          url: fileUrl,
          message:
            'Upload placeholder: In production, integrate AWS S3 or Cloudinary SDK via IStorageService',
        },
        'Image uploaded successfully (mock)',
      );
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // PART 3: USER CONTROLLERS
  // ==========================================

  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.userId;
      const user = await adminService.createUser(adminId, req.body);
      sendCreated(res, user, 'User created successfully');
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await adminService.getUsers(req.query as any);
      sendPaginated(res, users, 'Users retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await adminService.getUserById(req.params.id as string);
      sendSuccess(res, user, 'User retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.userId;
      const user = await adminService.updateUser(adminId, req.params.id as string, req.body);
      sendSuccess(res, user, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.userId;
      const { is_active } = req.body;
      const user = await adminService.updateUserStatus(adminId, req.params.id as string, is_active);
      sendSuccess(res, user, `User ${is_active ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      next(error);
    }
  }

  async resetUserPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.userId;
      const { password } = req.body;
      const user = await adminService.resetUserPassword(adminId, req.params.id as string, password);
      sendSuccess(res, user, 'User password reset successfully; prior sessions revoked');
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.userId;
      await adminService.deleteUser(adminId, req.params.id as string);
      sendSuccess(res, null, 'User deleted successfully (soft-deleted)');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // EXISTING STATS & ORDERS CONTROLLERS
  // ==========================================

  async getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status as string;
      const orders = await adminService.getOrders(page, limit, status);
      sendPaginated(res, orders, 'All orders retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await adminService.updateOrderStatus(
        req.params.id as string,
        req.body.status,
        req.body.paymentStatus,
      );
      sendSuccess(res, order, 'Order status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getDashboardStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await adminService.getDashboardStats();
      sendSuccess(res, stats, 'Dashboard statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
