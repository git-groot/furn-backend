import { z } from 'zod';

export const createReviewSchema = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid product ID'),
  }),
  body: z.object({
    rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
    title: z.string().max(150).optional(),
    comment: z.string().min(5, 'Review must be at least 5 characters').max(2000),
  }),
});

