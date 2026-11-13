import { NextFunction, Request, Response } from 'express';
import { reviewService } from '../services/review.service';
import { sendCreated, sendSuccess } from '../utils/response';

export class ReviewController {
  async getProductReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviews = await reviewService.getProductReviews(req.params.productId as string);
      sendSuccess(res, reviews, 'Reviews retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async addReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const review = await reviewService.addReview(
        req.user!.userId,
        req.params.productId as string,
        req.body,
      );
      sendCreated(res, review, 'Review submitted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const reviewController = new ReviewController();
