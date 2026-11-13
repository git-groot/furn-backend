import { NextFunction, Request, Response } from 'express';
import { orderService } from '../services/order.service';
import { sendCreated, sendPaginated, sendSuccess } from '../utils/response';

export class OrderController {
  async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const sessionToken = req.headers['x-session-token'] as string;
      const order = await orderService.createOrder(userId, {
        addressId: req.body.addressId,
        shippingAddress: req.body.shippingAddress,
        paymentMethod: req.body.paymentMethod,
        notes: req.body.notes,
        sessionToken,
      });
      sendCreated(res, order, 'Order placed successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMyOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const result = await orderService.getUserOrders(req.user!.userId, page, limit);
      sendPaginated(res, result, 'Orders retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = req.user?.role === 'admin';
      const order = await orderService.getOrderDetails(
        req.params.id as string,
        req.user?.userId,
        isAdmin,
      );
      sendSuccess(res, order, 'Order retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const orderController = new OrderController();
