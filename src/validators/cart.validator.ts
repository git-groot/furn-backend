import { z } from 'zod';

export const addToCartSchema = z.object({
  body: z.object({
    productId: z.string().uuid('Invalid product ID'),
    variantId: z.string().uuid('Invalid variant ID').optional().nullable(),
    quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50),
    sessionToken: z.string().optional(),
  }),
});

export const updateCartItemSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid cart item ID'),
  }),
  body: z.object({
    quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50),
  }),
});

export const cartItemParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid cart item ID'),
  }),
});

