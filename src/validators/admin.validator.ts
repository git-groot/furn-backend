import { z } from 'zod';

// ==========================================
// ADMIN PRODUCT VALIDATION SCHEMAS
// ==========================================

export const createAdminProductSchema = z.object({
  body: z
    .object({
      name: z.string().min(2, 'Name must be at least 2 characters').max(255).optional(),
      title: z.string().min(2, 'Title must be at least 2 characters').max(255).optional(),
      slug: z
        .string()
        .min(2)
        .max(255)
        .regex(/^[a-z0-9-]+$/, 'Slug must be lower-case kebab format')
        .optional(),
      sku: z.string().min(2, 'SKU must be at least 2 characters').max(100),
      description: z.string().min(10, 'Description must be at least 10 characters'),
      short_description: z.string().max(500).optional(),
      category_id: z.string().uuid('Category ID must be a valid UUID'),
      price: z.number().positive('Price must be greater than 0'),
      discount_price: z.number().positive('Discount price must be greater than 0').optional().nullable(),
      primary_material: z.string().min(2).default('Solid Wood'),
      secondary_material: z.string().optional().nullable(),
      dimensions: z.string().optional().nullable(),
      assembly_required: z.boolean().default(false),
      finish: z.string().optional().nullable(),
      dispatch_time: z.string().default('2 to 3 Weeks'),
      warranty: z.string().default('1 Year'),
      care_guide: z.string().optional().nullable(),
      is_featured: z.boolean().default(false),
      is_active: z.boolean().default(true),
      images: z
        .array(
          z.object({
            image_url: z.string().url('Image must be a valid URL'),
            alt_text: z.string().optional(),
            is_primary: z.boolean().default(false),
            sort_order: z.number().int().default(0),
            display_order: z.number().int().optional(),
          }),
        )
        .optional(),
      variants: z
        .array(
          z.object({
            sku: z.string().min(2).optional(),
            title: z.string().optional(),
            wood_type: z.string().min(1).default('Sheesham Wood'),
            size: z.string().optional().nullable(),
            color: z.string().optional().nullable(),
            finish: z.string().optional().nullable(),
            price: z.number().positive().optional(),
            price_adjustment: z.number().optional(),
            stock: z.number().int().min(0).optional(),
            stock_quantity: z.number().int().min(0).optional(),
            is_active: z.boolean().default(true),
          }),
        )
        .optional(),
    })
    .refine((data) => data.name || data.title, {
      message: 'Product name or title is required',
      path: ['name'],
    })
    .refine(
      (data) => {
        if (data.discount_price !== undefined && data.discount_price !== null) {
          return data.discount_price < data.price;
        }
        return true;
      },
      {
        message: 'Discount price must be strictly less than the regular price',
        path: ['discount_price'],
      },
    ),
});

export const updateAdminProductSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid product ID format'),
  }),
  body: z
    .object({
      name: z.string().min(2).max(255).optional(),
      title: z.string().min(2).max(255).optional(),
      slug: z
        .string()
        .min(2)
        .max(255)
        .regex(/^[a-z0-9-]+$/)
        .optional(),
      sku: z.string().min(2).max(100).optional(),
      description: z.string().min(10).optional(),
      short_description: z.string().max(500).optional().nullable(),
      category_id: z.string().uuid().optional(),
      price: z.number().positive().optional(),
      discount_price: z.number().positive().optional().nullable(),
      primary_material: z.string().min(2).optional(),
      secondary_material: z.string().optional().nullable(),
      dimensions: z.string().optional().nullable(),
      assembly_required: z.boolean().optional(),
      finish: z.string().optional().nullable(),
      dispatch_time: z.string().optional(),
      warranty: z.string().optional(),
      care_guide: z.string().optional().nullable(),
      is_featured: z.boolean().optional(),
      is_active: z.boolean().optional(),
      images: z
        .array(
          z.object({
            image_url: z.string().url(),
            alt_text: z.string().optional(),
            is_primary: z.boolean().default(false),
            sort_order: z.number().int().default(0),
            display_order: z.number().int().optional(),
          }),
        )
        .optional(),
      variants: z
        .array(
          z.object({
            id: z.string().uuid().optional(),
            sku: z.string().min(2).optional(),
            title: z.string().optional(),
            wood_type: z.string().min(1).optional(),
            size: z.string().optional().nullable(),
            color: z.string().optional().nullable(),
            finish: z.string().optional().nullable(),
            price: z.number().positive().optional(),
            price_adjustment: z.number().optional(),
            stock: z.number().int().min(0).optional(),
            stock_quantity: z.number().int().min(0).optional(),
            is_active: z.boolean().optional(),
          }),
        )
        .optional(),
    })
    .refine(
      (data) => {
        if (data.price !== undefined && data.discount_price !== undefined && data.discount_price !== null) {
          return data.discount_price < data.price;
        }
        return true;
      },
      {
        message: 'Discount price must be strictly less than price',
        path: ['discount_price'],
      },
    ),
});

export const patchAdminProductSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid product ID format'),
  }),
  body: z.object({
    is_active: z.boolean().optional(),
    price: z.number().positive().optional(),
    discount_price: z.number().positive().optional().nullable(),
    stock: z.number().int().min(0).optional(),
    description: z.string().min(10).optional(),
  }),
});

export const bulkStatusProductSchema = z.object({
  body: z.object({
    product_ids: z.array(z.string().uuid('Each item must be a valid product UUID')).min(1, 'Provide at least one product ID'),
    is_active: z.boolean(),
  }),
});

export const adminProductQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    category: z.string().optional(),
    status: z.enum(['active', 'inactive', 'deleted', 'all']).default('all'),
    stock: z.enum(['in_stock', 'low_stock', 'out_of_stock']).optional(),
    sort: z.enum(['price', 'created_at', 'name', 'title']).default('created_at'),
    order: z.enum(['asc', 'desc']).default('desc'),
    search: z.string().optional(),
  }),
});

// ==========================================
// ADMIN USER VALIDATION SCHEMAS
// ==========================================

export const createAdminUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address format').toLowerCase().trim(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      ),
    first_name: z.string().min(1, 'First name is required').max(100).trim(),
    last_name: z.string().min(1, 'Last name is required').max(100).trim(),
    phone: z
      .string()
      .regex(/^\+?[0-9\s-]{8,20}$/, 'Invalid phone number format')
      .optional()
      .nullable(),
    role: z.enum(['customer', 'admin']).default('customer'),
    is_active: z.boolean().default(true),
  }),
});

export const updateAdminUserSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
  body: z.object({
    first_name: z.string().min(1).max(100).trim().optional(),
    last_name: z.string().min(1).max(100).trim().optional(),
    phone: z
      .string()
      .regex(/^\+?[0-9\s-]{8,20}$/, 'Invalid phone number format')
      .optional()
      .nullable(),
    role: z.enum(['customer', 'admin']).optional(),
    is_active: z.boolean().optional(),
  }),
});

export const updateUserStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
  body: z.object({
    is_active: z.boolean(),
  }),
});

export const resetUserPasswordSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
  body: z.object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      ),
  }),
});

export const adminUserQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    role: z.enum(['customer', 'admin']).optional(),
    status: z.enum(['active', 'inactive', 'deleted', 'all']).default('all'),
    sort: z.enum(['name', 'email', 'role', 'created_at']).default('created_at'),
    order: z.enum(['asc', 'desc']).default('desc'),
    search: z.string().optional(),
  }),
});

