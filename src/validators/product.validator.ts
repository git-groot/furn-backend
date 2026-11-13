import { z } from 'zod';

export const productQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(12),
    sort: z
      .enum(['price_asc', 'price_desc', 'newest', 'rating', 'title_asc', 'title_desc'])
      .default('newest'),
    category: z.string().optional(),
    wood_type: z.string().optional(),
    min_price: z.coerce.number().min(0).optional(),
    max_price: z.coerce.number().min(0).optional(),
    search: z.string().optional(),
    featured: z
      .preprocess((val) => (val === undefined ? undefined : val === 'true' || val === true), z.boolean())
      .optional(),
  }),
});

export const productSlugSchema = z.object({
  params: z.object({
    slug: z.string().min(1, 'Product slug is required'),
  }),
});

export const createProductSchema = z.object({
  body: z.object({
    category_id: z.string().uuid('Invalid category ID'),
    title: z.string().min(2, 'Title must be at least 2 characters').max(200),
    slug: z
      .string()
      .min(2)
      .max(200)
      .regex(/^[a-z0-9-]+$/, 'Slug must be kebab-case'),
    sku: z.string().min(2).max(50),
    short_description: z.string().max(500).optional(),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    base_price: z.number().positive('Price must be greater than 0'),
    compare_at_price: z.number().positive().optional(),
    primary_material: z.string().min(2),
    secondary_material: z.string().optional(),
    dimensions: z.string().optional(),
    assembly_required: z.boolean().default(false),
    finish: z.string().optional(),
    dispatch_time: z.string().default('2 to 3 Weeks'),
    warranty: z.string().default('1 Year'),
    care_guide: z.string().optional(),
    is_featured: z.boolean().default(false),
    is_active: z.boolean().default(true),
    images: z
      .array(
        z.object({
          image_url: z.string().url('Image must be a valid URL'),
          alt_text: z.string().optional(),
          is_primary: z.boolean().default(false),
          display_order: z.number().int().default(0),
        }),
      )
      .optional(),
    variants: z
      .array(
        z.object({
          sku: z.string().min(2),
          title: z.string().min(1),
          wood_type: z.string().min(1),
          size: z.string().optional(),
          finish: z.string().optional(),
          price: z.number().positive(),
          compare_at_price: z.number().positive().optional(),
          stock_quantity: z.number().int().min(0).default(10),
          is_active: z.boolean().default(true),
        }),
      )
      .optional(),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid product ID'),
  }),
  body: createProductSchema.shape.body.partial(),
});
