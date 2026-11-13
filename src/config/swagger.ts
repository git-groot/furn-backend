import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'MyFurniture REST API',
    version: '1.0.0',
    description:
      'Production-grade RESTful API for MyFurniture handcrafted solid wood online furniture store. Inspired by Woodsala. Includes comprehensive customer and administrative management capabilities.',
    contact: {
      name: 'MyFurniture Engineering Team',
      email: 'engineering@myfurniture.com',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Base Endpoint',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: { type: 'object' },
          meta: { type: 'object' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          phone: { type: 'string' },
          role: { type: 'string', enum: ['customer', 'admin'] },
          is_active: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          slug: { type: 'string' },
          sku: { type: 'string' },
          description: { type: 'string' },
          base_price: { type: 'number' },
          compare_at_price: { type: 'number' },
          primary_material: { type: 'string' },
          dimensions: { type: 'string' },
          is_active: { type: 'boolean' },
          primary_image: { type: 'string' },
          avg_rating: { type: 'number' },
          review_count: { type: 'number' },
        },
      },
      AdminProductInput: {
        type: 'object',
        required: ['name', 'sku', 'category_id', 'price', 'description'],
        properties: {
          name: { type: 'string' },
          slug: { type: 'string' },
          sku: { type: 'string' },
          category_id: { type: 'string', format: 'uuid' },
          price: { type: 'number', minimum: 0 },
          discount_price: { type: 'number', minimum: 0 },
          description: { type: 'string' },
          is_active: { type: 'boolean', default: true },
          images: {
            type: 'array',
            items: {
              type: 'object',
              required: ['image_url'],
              properties: {
                image_url: { type: 'string', format: 'uri' },
                alt_text: { type: 'string' },
                is_primary: { type: 'boolean' },
                sort_order: { type: 'integer' },
              },
            },
          },
          variants: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                sku: { type: 'string' },
                size: { type: 'string' },
                wood_type: { type: 'string' },
                color: { type: 'string' },
                price: { type: 'number' },
                stock: { type: 'integer' },
              },
            },
          },
        },
      },
      AdminUserInput: {
        type: 'object',
        required: ['email', 'password', 'first_name', 'last_name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          phone: { type: 'string' },
          role: { type: 'string', enum: ['customer', 'admin'], default: 'customer' },
          is_active: { type: 'boolean', default: true },
        },
      },
      CartItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          productId: { type: 'string', format: 'uuid' },
          variantId: { type: 'string', format: 'uuid', nullable: true },
          quantity: { type: 'integer' },
          product_title: { type: 'string' },
          unit_price: { type: 'number' },
        },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new customer account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'first_name', 'last_name'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  first_name: { type: 'string' },
                  last_name: { type: 'string' },
                  phone: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Registration successful' },
          409: { description: 'Email already exists' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate user with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful' },
          401: { description: 'Invalid credentials or inactive account' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh expired access token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Token refreshed successfully' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get currently authenticated user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'User profile retrieved' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/categories': {
      get: {
        tags: ['Categories'],
        summary: 'Get all categories with subcategories',
        responses: {
          200: { description: 'Category tree retrieved' },
        },
      },
    },
    '/products': {
      get: {
        tags: ['Products'],
        summary: 'Search and filter active products catalog',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'wood_type', in: 'query', schema: { type: 'string' } },
          { name: 'min_price', in: 'query', schema: { type: 'number' } },
          { name: 'max_price', in: 'query', schema: { type: 'number' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sort', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 12 } },
        ],
        responses: {
          200: { description: 'Paginated list of active products' },
        },
      },
    },
    '/products/{slug}': {
      get: {
        tags: ['Products'],
        summary: 'Get active product details by slug',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Product detailed view' },
          404: { description: 'Product not found' },
        },
      },
    },
    '/cart': {
      get: {
        tags: ['Cart'],
        summary: 'Get current user cart items',
        responses: {
          200: { description: 'Cart items with computed totals' },
        },
      },
    },
    '/cart/items': {
      post: {
        tags: ['Cart'],
        summary: 'Add product or variant to cart',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['productId', 'quantity'],
                properties: {
                  productId: { type: 'string', format: 'uuid' },
                  variantId: { type: 'string', format: 'uuid' },
                  quantity: { type: 'integer', minimum: 1 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Cart updated' },
        },
      },
    },
    '/orders': {
      post: {
        tags: ['Orders'],
        summary: 'Create order and checkout from cart items (transactional)',
        security: [{ bearerAuth: [] }],
        responses: {
          201: { description: 'Order created successfully' },
        },
      },
    },
    '/orders/my-orders': {
      get: {
        tags: ['Orders'],
        summary: 'Get customer order history',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'List of customer orders' },
        },
      },
    },

    // ==========================================
    // ADMIN ENDPOINTS
    // ==========================================
    '/admin/stats': {
      get: {
        tags: ['Admin - Dashboard'],
        summary: 'Get store performance KPIs & analytics',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Dashboard metrics' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden: requires admin role' },
        },
      },
    },
    '/admin/products': {
      post: {
        tags: ['Admin - Products'],
        summary: 'Create a new product with variants and images (transactional)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AdminProductInput' },
            },
          },
        },
        responses: {
          201: { description: 'Product created successfully' },
          400: { description: 'Bad request or validation error' },
          404: { description: 'Referenced category not found' },
          409: { description: 'SKU or slug collision' },
        },
      },
      get: {
        tags: ['Admin - Products'],
        summary: 'List products with admin filters, status, stock, and pagination',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'inactive', 'deleted', 'all'] } },
          { name: 'stock', in: 'query', schema: { type: 'string', enum: ['in_stock', 'low_stock', 'out_of_stock'] } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['price', 'created_at', 'name'] } },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: { description: 'Paginated admin products list' },
        },
      },
    },
    '/admin/products/bulk-status': {
      patch: {
        tags: ['Admin - Products'],
        summary: 'Bulk activate or deactivate a list of products',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['product_ids', 'is_active'],
                properties: {
                  product_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  is_active: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Bulk status update applied' },
        },
      },
    },
    '/admin/products/{id}': {
      get: {
        tags: ['Admin - Products'],
        summary: 'Get single product detail with images and variants (including inactive/deleted)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Product detail' },
          404: { description: 'Product not found' },
        },
      },
      put: {
        tags: ['Admin - Products'],
        summary: 'Full update of product properties, images, and variants',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AdminProductInput' },
            },
          },
        },
        responses: {
          200: { description: 'Product updated successfully' },
          404: { description: 'Product not found' },
          409: { description: 'SKU or slug collision' },
        },
      },
      patch: {
        tags: ['Admin - Products'],
        summary: 'Partial update of product (e.g. toggle active, update stock or price)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  is_active: { type: 'boolean' },
                  price: { type: 'number' },
                  discount_price: { type: 'number' },
                  stock: { type: 'integer' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Product patched successfully' },
          404: { description: 'Product not found' },
        },
      },
      delete: {
        tags: ['Admin - Products'],
        summary: 'Soft-delete a product (order items are preserved)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Product soft-deleted successfully' },
          404: { description: 'Product not found' },
        },
      },
    },
    '/admin/uploads': {
      post: {
        tags: ['Admin - Products'],
        summary: 'Placeholder for image uploads (TODO: Cloudinary / AWS S3)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  filename: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Upload mock URL returned' },
        },
      },
    },
    '/admin/users': {
      post: {
        tags: ['Admin - Users'],
        summary: 'Create a new user (customer or admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AdminUserInput' },
            },
          },
        },
        responses: {
          201: { description: 'User created successfully' },
          409: { description: 'Email already exists' },
        },
      },
      get: {
        tags: ['Admin - Users'],
        summary: 'List users with pagination, role, status, and search',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['customer', 'admin'] } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'inactive', 'deleted', 'all'] } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['name', 'email', 'role', 'created_at'] } },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: { description: 'Paginated user list' },
        },
      },
    },
    '/admin/users/{id}': {
      get: {
        tags: ['Admin - Users'],
        summary: 'Get single user by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'User profile retrieved' },
          404: { description: 'User not found' },
        },
      },
      put: {
        tags: ['Admin - Users'],
        summary: 'Update user properties (name, phone, role, status)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  first_name: { type: 'string' },
                  last_name: { type: 'string' },
                  phone: { type: 'string' },
                  role: { type: 'string', enum: ['customer', 'admin'] },
                  is_active: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'User updated successfully' },
          400: { description: 'Self-demote or last admin protection triggered' },
          404: { description: 'User not found' },
        },
      },
      delete: {
        tags: ['Admin - Users'],
        summary: 'Soft-delete user (with self-delete and last-admin protection)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'User soft-deleted successfully' },
          400: { description: 'Self-delete or last admin protection triggered' },
          404: { description: 'User not found' },
        },
      },
    },
    '/admin/users/{id}/status': {
      patch: {
        tags: ['Admin - Users'],
        summary: 'Activate or deactivate user account',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['is_active'],
                properties: {
                  is_active: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'User status updated' },
          400: { description: 'Self-deactivation or last admin protection triggered' },
        },
      },
    },
    '/admin/users/{id}/password': {
      patch: {
        tags: ['Admin - Users'],
        summary: "Reset user password and invalidate that user's active refresh tokens",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password'],
                properties: {
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password reset and sessions invalidated' },
          404: { description: 'User not found' },
        },
      },
    },
    '/admin/orders': {
      get: {
        tags: ['Admin - Orders'],
        summary: 'List all store customer orders with pagination',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Paginated customer orders' },
        },
      },
    },
    '/admin/orders/{id}/status': {
      patch: {
        tags: ['Admin - Orders'],
        summary: 'Update customer order status and payment status',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  paymentStatus: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Order updated' },
        },
      },
    },
  },
};

export const setupSwagger = (app: Express): void => {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
  });
};
