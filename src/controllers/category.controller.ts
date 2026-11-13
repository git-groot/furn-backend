import { NextFunction, Request, Response } from 'express';
import { categoryService } from '../services/category.service';
import { sendSuccess } from '../utils/response';

export class CategoryController {
  async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await categoryService.getAll();
      sendSuccess(res, categories, 'Categories retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await categoryService.getBySlug(req.params.slug as string);
      sendSuccess(res, category, 'Category retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const categoryController = new CategoryController();
