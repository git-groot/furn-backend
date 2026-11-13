import { Router } from 'express';
import { reviewController } from '../controllers/review.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { createReviewSchema } from '../validators/review.validator';

const router = Router();

router.get(
  '/products/:productId/reviews',
  reviewController.getProductReviews.bind(reviewController),
);

router.post(
  '/products/:productId/reviews',
  authenticate,
  validate(createReviewSchema),
  reviewController.addReview.bind(reviewController),
);

export default router;
