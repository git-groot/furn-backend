import { db } from '../config/database';
import { Review, ReviewWithUser } from '../types';

export class ReviewRepository {
  async findByProductId(productId: string): Promise<ReviewWithUser[]> {
    const res = await db.query<ReviewWithUser>(
      `SELECT 
        r.*,
        CONCAT(u.first_name, ' ', SUBSTRING(u.last_name, 1, 1), '.') as user_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = $1 AND r.status = 'approved'
       ORDER BY r.created_at DESC`,
      [productId],
    );
    return res.rows;
  }

  async create(data: {
    product_id: string;
    user_id: string;
    rating: number;
    title?: string;
    comment: string;
    is_verified_purchase?: boolean;
  }): Promise<Review> {
    const res = await db.query<Review>(
      `INSERT INTO reviews (product_id, user_id, rating, title, comment, is_verified_purchase, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'approved')
       RETURNING *`,
      [
        data.product_id,
        data.user_id,
        data.rating,
        data.title || null,
        data.comment,
        data.is_verified_purchase ?? true,
      ],
    );
    return res.rows[0];
  }
}

export const reviewRepository = new ReviewRepository();

