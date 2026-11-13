import { NextFunction, Request, Response } from 'express';
import { productService } from '../services/product.service';
import { sendPaginated, sendSuccess } from '../utils/response';

export class ProductController {
  async getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productService.getProducts(req.query as any);
      sendPaginated(res, result, 'Products retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getProductBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productService.getProductBySlug(req.params.slug as string);
      sendSuccess(res, product, 'Product retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getRelatedProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 4;
      const related = await productService.getRelatedProducts(req.params.slug as string, limit);
      sendSuccess(res, related, 'Related products retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
