import { z } from 'zod';

export const addressSchema = z.object({
  body: z.object({
    full_name: z.string().min(2, 'Full name must be at least 2 characters').max(100),
    phone: z.string().regex(/^[0-9+ -]{10,15}$/, 'Invalid phone number'),
    address_line1: z.string().min(5, 'Address line 1 must be at least 5 characters').max(255),
    address_line2: z.string().max(255).optional(),
    city: z.string().min(2, 'City is required').max(100),
    state: z.string().min(2, 'State is required').max(100),
    postal_code: z.string().regex(/^[0-9]{5,10}$/, 'Invalid postal code'),
    country: z.string().default('India'),
    is_default: z.boolean().default(false),
    address_type: z.enum(['home', 'work', 'other']).default('home'),
  }),
});

export const updateAddressSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid address ID'),
  }),
  body: addressSchema.shape.body.partial(),
});

