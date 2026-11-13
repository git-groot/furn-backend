import { productRepository } from '../repositories/product.repository';
import { reviewRepository } from '../repositories/review.repository';
import { Review, ReviewWithUser } from '../types';
import { NotFoundError } from '../utils/errors';

export class ReviewService {
  async getProductReviews(productId: string): Promise<ReviewWithUser[]> {
    const product = await productRepository.findById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    return reviewRepository.findByProductId(productId);
  }

  async addReview(
    userId: string,
    productId: string,
    data: { rating: number; title?: string; comment: string },
  ): Promise<Review> {
    const product = await productRepository.findById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return reviewRepository.create({
      product_id: productId,
      user_id: userId,
      rating: data.rating,
      title: data.title,
      comment: data.comment,
      is_verified_purchase: true,
    });
  }
}

export const reviewService = new ReviewService();

