import { NextFunction, Request, Response } from 'express';
import { cartService } from '../services/cart.service';
import { sendSuccess } from '../utils/response';

export class CartController {
  private getIdentifiers(req: Request) {
    const userId = req.user?.userId;
    const sessionToken = (req.headers['x-session-token'] as string) || req.body.sessionToken;
    return { userId, sessionToken };
  }

  async getCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, sessionToken } = this.getIdentifiers(req);
      const cart = await cartService.getCart(userId, sessionToken);
      sendSuccess(res, cart, 'Cart retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async addItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, sessionToken } = this.getIdentifiers(req);
      const cart = await cartService.addItem({
        userId,
        sessionToken,
        productId: req.body.productId,
        variantId: req.body.variantId,
        quantity: req.body.quantity,
      });
      sendSuccess(res, cart, 'Item added to cart');
    } catch (error) {
      next(error);
    }
  }

  async updateQuantity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, sessionToken } = this.getIdentifiers(req);
      const cart = await cartService.updateQuantity(
        req.params.id as string,
        req.body.quantity,
        userId,
        sessionToken,
      );
      sendSuccess(res, cart, 'Cart quantity updated');
    } catch (error) {
      next(error);
    }
  }

  async removeItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, sessionToken } = this.getIdentifiers(req);
      const cart = await cartService.removeItem(req.params.id as string, userId, sessionToken);
      sendSuccess(res, cart, 'Item removed from cart');
    } catch (error) {
      next(error);
    }
  }

  async clearCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, sessionToken } = this.getIdentifiers(req);
      await cartService.clearCart(userId, sessionToken);
      sendSuccess(res, null, 'Cart cleared successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const cartController = new CartController();
