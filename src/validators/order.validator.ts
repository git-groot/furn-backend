import { z } from 'zod';

export const createOrderSchema = z.object({
  body: z.object({
    addressId: z.string().uuid('Invalid address ID').optional(),
    shippingAddress: z
      .object({
        full_name: z.string().min(2, 'Full name is required'),
        phone: z.string().min(10, 'Phone must be at least 10 digits'),
        address_line1: z.string().min(5, 'Address line 1 is required'),
        address_line2: z.string().optional(),
        city: z.string().min(2, 'City is required'),
        state: z.string().min(2, 'State is required'),
        postal_code: z.string().regex(/^[0-9]{5,10}$/, 'Invalid postal code'),
        country: z.string().default('India'),
      })
      .optional(),
    paymentMethod: z.enum(['cod', 'card', 'upi', 'netbanking']).default('cod'),
    notes: z.string().max(500).optional(),
    sessionToken: z.string().optional(),
  }),
});

export const updateOrderStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid order ID'),
  }),
  body: z.object({
    status: z
      .enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
      .optional(),
    paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
  }),
});

