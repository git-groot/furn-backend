import { db } from '../config/database';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { categoryRepository } from '../repositories/category.repository';
import { orderRepository } from '../repositories/order.repository';
import { productRepository } from '../repositories/product.repository';
import { toUserResponse, userRepository } from '../repositories/user.repository';
import {
  AdminProductFilterQuery,
  AdminUserFilterQuery,
  Order,
  PaginatedResult,
  Product,
  ProductImage,
  ProductVariant,
  UserWithoutPassword,
} from '../types';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors';
import { hashPassword } from '../utils/password';

export class AdminService {
  // ==========================================
  // PART 2: ADMIN PRODUCTS MANAGEMENT
  // ==========================================

  async createProduct(adminId: string, data: any): Promise<Product & { images: ProductImage[]; variants: ProductVariant[] }> {
    // 1. Verify category exists
    const category = await categoryRepository.findById(data.category_id);
    if (!category) {
      throw new NotFoundError(`Category with ID '${data.category_id}' does not exist`);
    }

    // 2. Generate slug if not provided and check uniqueness
    const title = data.name || data.title;
    const slug = (
      data.slug ||
      title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    );

    const existingSlug = await productRepository.findBySlugAny(slug);
    if (existingSlug) {
      throw new ConflictError(`A product with slug '${slug}' already exists`);
    }

    // 3. Check SKU uniqueness
    const existingSku = await productRepository.findBySku(data.sku);
    if (existingSku) {
      throw new ConflictError(`A product with SKU '${data.sku}' already exists`);
    }

    // 4. Map Price & Discount Price:
    // If discount_price is provided, base_price is the discounted selling price
    // and compare_at_price is the regular price (satisfying DB check compare_at_price >= base_price)
    let basePrice = data.price;
    let compareAtPrice: number | null = null;

    if (data.discount_price !== undefined && data.discount_price !== null) {
      basePrice = data.discount_price;
      compareAtPrice = data.price;
    }

    // 5. Atomic Transaction: product + images + variants + inventory
    const createdProduct = await db.transaction(async (client) => {
      const prodRes = await client.query<Product>(
        `INSERT INTO products (
          category_id, title, slug, sku, short_description, description,
          base_price, compare_at_price, primary_material, secondary_material,
          dimensions, assembly_required, finish, dispatch_time, warranty,
          care_guide, is_featured, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *`,
        [
          data.category_id,
          title,
          slug,
          data.sku,
          data.short_description || null,
          data.description,
          basePrice,
          compareAtPrice,
          data.primary_material || 'Solid Wood',
          data.secondary_material || null,
          data.dimensions || null,
          data.assembly_required ?? false,
          data.finish || null,
          data.dispatch_time || '2 to 3 Weeks',
          data.warranty || '1 Year',
          data.care_guide || null,
          data.is_featured ?? false,
          data.is_active ?? true,
        ],
      );
      const product = prodRes.rows[0];

      // Insert images
      const savedImages: ProductImage[] = [];
      if (data.images && Array.isArray(data.images) && data.images.length > 0) {
        for (let i = 0; i < data.images.length; i++) {
          const img = data.images[i];
          const imgRes = await client.query<ProductImage>(
            `INSERT INTO product_images (product_id, image_url, alt_text, is_primary, display_order)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
              product.id,
              img.image_url,
              img.alt_text || product.title,
              img.is_primary || i === 0,
              img.sort_order ?? img.display_order ?? i,
            ],
          );
          savedImages.push(imgRes.rows[0]);
        }
      }

      // Insert variants and initialize inventory
      const savedVariants: ProductVariant[] = [];
      if (data.variants && Array.isArray(data.variants) && data.variants.length > 0) {
        for (let i = 0; i < data.variants.length; i++) {
          const v = data.variants[i];
          const variantSku = v.sku || `${product.sku}-${i + 1}`;
          const variantTitle = v.title || `${product.title} - ${v.wood_type || 'Natural'} ${v.size || ''}`.trim();
          const variantPrice = v.price || (v.price_adjustment ? basePrice + v.price_adjustment : basePrice);
          const stock = v.stock ?? v.stock_quantity ?? 10;

          const varRes = await client.query<ProductVariant>(
            `INSERT INTO product_variants (
              product_id, sku, title, wood_type, size, finish,
              price, compare_at_price, stock_quantity, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *`,
            [
              product.id,
              variantSku,
              variantTitle,
              v.wood_type || data.primary_material || 'Solid Wood',
              v.size || null,
              v.color || v.finish || null,
              variantPrice,
              compareAtPrice,
              stock,
              v.is_active ?? true,
            ],
          );
          const variant = varRes.rows[0];
          savedVariants.push(variant);

          await client.query(
            `INSERT INTO inventory (variant_id, quantity) VALUES ($1, $2)`,
            [variant.id, stock],
          );
        }
      }

      return {
        ...product,
        images: savedImages,
        variants: savedVariants,
      };
    });

    // 6. Record Audit Log
    await auditLogRepository.log({
      admin_id: adminId,
      action: 'CREATE',
      resource_type: 'PRODUCT',
      resource_id: createdProduct.id,
      metadata: { title: createdProduct.title, sku: createdProduct.sku },
    });

    return createdProduct;
  }

  async getProducts(query: AdminProductFilterQuery): Promise<PaginatedResult<Product>> {
    return productRepository.findAdminProducts(query);
  }

  async getProductById(
    id: string,
  ): Promise<Product & { images: ProductImage[]; variants: ProductVariant[] }> {
    const product = await productRepository.findAdminProductById(id);
    if (!product) {
      throw new NotFoundError(`Product with ID '${id}' not found`);
    }
    return product;
  }

  async updateProduct(adminId: string, id: string, data: any): Promise<Product> {
    const existing = await productRepository.findAdminProductById(id);
    if (!existing) {
      throw new NotFoundError(`Product with ID '${id}' not found`);
    }

    if (data.category_id && data.category_id !== existing.category_id) {
      const category = await categoryRepository.findById(data.category_id);
      if (!category) {
        throw new NotFoundError(`Category with ID '${data.category_id}' does not exist`);
      }
    }

    if (data.slug && data.slug !== existing.slug) {
      const existingSlug = await productRepository.findBySlugAny(data.slug);
      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictError(`A product with slug '${data.slug}' already exists`);
      }
    }

    if (data.sku && data.sku !== existing.sku) {
      const existingSku = await productRepository.findBySku(data.sku);
      if (existingSku && existingSku.id !== id) {
        throw new ConflictError(`A product with SKU '${data.sku}' already exists`);
      }
    }

    const title = data.name || data.title || existing.title;
    let basePrice = data.price !== undefined ? data.price : existing.base_price;
    let compareAtPrice: number | null | undefined = existing.compare_at_price;

    if (data.discount_price !== undefined) {
      if (data.discount_price !== null) {
        basePrice = data.discount_price;
        compareAtPrice = data.price !== undefined ? data.price : existing.base_price;
      } else {
        compareAtPrice = null;
      }
    }

    const updated = await db.transaction(async (client) => {
      const prodRes = await client.query<Product>(
        `UPDATE products SET
          category_id = COALESCE($1, category_id),
          title = COALESCE($2, title),
          slug = COALESCE($3, slug),
          sku = COALESCE($4, sku),
          description = COALESCE($5, description),
          short_description = COALESCE($6, short_description),
          base_price = $7,
          compare_at_price = $8,
          primary_material = COALESCE($9, primary_material),
          secondary_material = COALESCE($10, secondary_material),
          dimensions = COALESCE($11, dimensions),
          assembly_required = COALESCE($12, assembly_required),
          finish = COALESCE($13, finish),
          dispatch_time = COALESCE($14, dispatch_time),
          warranty = COALESCE($15, warranty),
          care_guide = COALESCE($16, care_guide),
          is_featured = COALESCE($17, is_featured),
          is_active = COALESCE($18, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $19 AND deleted_at IS NULL
        RETURNING *`,
        [
          data.category_id || null,
          title,
          data.slug || null,
          data.sku || null,
          data.description || null,
          data.short_description !== undefined ? data.short_description : null,
          basePrice,
          compareAtPrice,
          data.primary_material || null,
          data.secondary_material !== undefined ? data.secondary_material : null,
          data.dimensions !== undefined ? data.dimensions : null,
          data.assembly_required !== undefined ? data.assembly_required : null,
          data.finish !== undefined ? data.finish : null,
          data.dispatch_time || null,
          data.warranty || null,
          data.care_guide !== undefined ? data.care_guide : null,
          data.is_featured !== undefined ? data.is_featured : null,
          data.is_active !== undefined ? data.is_active : null,
          id,
        ],
      );

      // If new images provided, sync them
      if (data.images && Array.isArray(data.images)) {
        await client.query('DELETE FROM product_images WHERE product_id = $1', [id]);
        for (let i = 0; i < data.images.length; i++) {
          const img = data.images[i];
          await client.query(
            `INSERT INTO product_images (product_id, image_url, alt_text, is_primary, display_order)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              id,
              img.image_url,
              img.alt_text || title,
              img.is_primary || i === 0,
              img.sort_order ?? img.display_order ?? i,
            ],
          );
        }
      }

      return prodRes.rows[0];
    });

    await auditLogRepository.log({
      admin_id: adminId,
      action: 'UPDATE',
      resource_type: 'PRODUCT',
      resource_id: id,
      metadata: { title: updated.title, sku: updated.sku },
    });

    return updated;
  }

  async patchProduct(adminId: string, id: string, data: any): Promise<Product> {
    const existing = await productRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Product with ID '${id}' not found`);
    }

    const updates: Partial<Product> = {};
    if (data.is_active !== undefined) updates.is_active = data.is_active;
    if (data.description !== undefined) updates.description = data.description;

    if (data.price !== undefined || data.discount_price !== undefined) {
      const price = data.price !== undefined ? data.price : existing.base_price;
      if (data.discount_price !== undefined) {
        if (data.discount_price !== null) {
          updates.base_price = data.discount_price;
          updates.compare_at_price = price;
        } else {
          updates.base_price = price;
          updates.compare_at_price = undefined;
        }
      } else {
        updates.base_price = price;
      }
    }

    const updated = await productRepository.update(id, updates);
    if (!updated) {
      throw new NotFoundError(`Failed to update product with ID '${id}'`);
    }

    // If stock specified in patch, update first variant or inventory
    if (data.stock !== undefined) {
      await db.query(
        `UPDATE product_variants SET stock_quantity = $1 WHERE product_id = $2`,
        [data.stock, id],
      );
    }

    await auditLogRepository.log({
      admin_id: adminId,
      action: 'PATCH',
      resource_type: 'PRODUCT',
      resource_id: id,
      metadata: data,
    });

    return updated;
  }

  async deleteProduct(adminId: string, id: string): Promise<void> {
    const existing = await productRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Product with ID '${id}' not found`);
    }

    // Soft delete guarantees existing order_items referencing this product are safely preserved
    await productRepository.softDelete(id);

    await auditLogRepository.log({
      admin_id: adminId,
      action: 'DELETE',
      resource_type: 'PRODUCT',
      resource_id: id,
      metadata: { title: existing.title, sku: existing.sku },
    });
  }

  async bulkUpdateProductStatus(
    adminId: string,
    productIds: string[],
    isActive: boolean,
  ): Promise<{ updatedCount: number }> {
    const updatedCount = await productRepository.bulkUpdateStatus(productIds, isActive);

    await auditLogRepository.log({
      admin_id: adminId,
      action: 'BULK_STATUS_UPDATE',
      resource_type: 'PRODUCT',
      resource_id: productIds.join(','),
      metadata: { count: updatedCount, is_active: isActive },
    });

    return { updatedCount };
  }

  // ==========================================
  // PART 3: ADMIN USERS MANAGEMENT
  // ==========================================

  async createUser(adminId: string, data: any): Promise<UserWithoutPassword> {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictError(`A user with email '${data.email}' already exists`);
    }

    const passwordHash = await hashPassword(data.password);
    const user = await userRepository.create({
      email: data.email,
      password_hash: passwordHash,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      role: data.role || 'customer',
      is_active: data.is_active ?? true,
    });

    await auditLogRepository.log({
      admin_id: adminId,
      action: 'CREATE',
      resource_type: 'USER',
      resource_id: user.id,
      metadata: { email: user.email, role: user.role },
    });

    return toUserResponse(user);
  }

  async getUsers(query: AdminUserFilterQuery): Promise<PaginatedResult<UserWithoutPassword>> {
    return userRepository.findAdminUsers(query);
  }

  async getUserById(id: string): Promise<UserWithoutPassword> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError(`User with ID '${id}' not found`);
    }
    return toUserResponse(user);
  }

  async updateUser(adminId: string, targetUserId: string, data: any): Promise<UserWithoutPassword> {
    const existing = await userRepository.findById(targetUserId);
    if (!existing) {
      throw new NotFoundError(`User with ID '${targetUserId}' not found`);
    }

    // Safety Rule 1: Admin cannot demote their own account
    if (adminId === targetUserId && data.role && data.role !== 'admin') {
      throw new BadRequestError('Admins cannot demote their own account');
    }

    // Safety Rule 2: Admin cannot deactivate their own account
    if (adminId === targetUserId && data.is_active === false) {
      throw new BadRequestError('Admins cannot deactivate their own account');
    }

    // Safety Rule 3: Demoting another admin must not leave system without an active admin
    if (existing.role === 'admin' && data.role && data.role !== 'admin') {
      const remainingAdmins = await userRepository.countActiveAdmins(targetUserId);
      if (remainingAdmins <= 0) {
        throw new BadRequestError(
          'Cannot demote administrator: system must retain at least one active administrator',
        );
      }
    }

    const updated = await userRepository.update(targetUserId, data);
    if (!updated) {
      throw new NotFoundError(`Failed to update user with ID '${targetUserId}'`);
    }

    await auditLogRepository.log({
      admin_id: adminId,
      action: 'UPDATE',
      resource_type: 'USER',
      resource_id: targetUserId,
      metadata: data,
    });

    return toUserResponse(updated);
  }

  async updateUserStatus(
    adminId: string,
    targetUserId: string,
    isActive: boolean,
  ): Promise<UserWithoutPassword> {
    const existing = await userRepository.findById(targetUserId);
    if (!existing) {
      throw new NotFoundError(`User with ID '${targetUserId}' not found`);
    }

    // Safety Rule: Admin cannot deactivate themselves
    if (adminId === targetUserId && !isActive) {
      throw new BadRequestError('Admins cannot deactivate their own account');
    }

    // Safety Rule: Deactivating another admin must not leave system without an active admin
    if (existing.role === 'admin' && !isActive) {
      const remainingAdmins = await userRepository.countActiveAdmins(targetUserId);
      if (remainingAdmins <= 0) {
        throw new BadRequestError(
          'Cannot deactivate administrator: system must retain at least one active administrator',
        );
      }
    }

    const updated = await userRepository.updateStatus(targetUserId, isActive);
    if (!updated) {
      throw new NotFoundError(`Failed to update status for user with ID '${targetUserId}'`);
    }

    await auditLogRepository.log({
      admin_id: adminId,
      action: 'STATUS_UPDATE',
      resource_type: 'USER',
      resource_id: targetUserId,
      metadata: { is_active: isActive },
    });

    return toUserResponse(updated);
  }

  async resetUserPassword(
    adminId: string,
    targetUserId: string,
    newPassword: string,
  ): Promise<UserWithoutPassword> {
    const existing = await userRepository.findById(targetUserId);
    if (!existing) {
      throw new NotFoundError(`User with ID '${targetUserId}' not found`);
    }

    const passwordHash = await hashPassword(newPassword);
    const updated = await userRepository.updatePassword(targetUserId, passwordHash);
    if (!updated) {
      throw new NotFoundError(`Failed to reset password for user with ID '${targetUserId}'`);
    }

    await auditLogRepository.log({
      admin_id: adminId,
      action: 'PASSWORD_RESET',
      resource_type: 'USER',
      resource_id: targetUserId,
    });

    return toUserResponse(updated);
  }

  async deleteUser(adminId: string, targetUserId: string): Promise<void> {
    const existing = await userRepository.findById(targetUserId);
    if (!existing) {
      throw new NotFoundError(`User with ID '${targetUserId}' not found`);
    }

    // Safety Rule 1: Admin cannot delete their own account
    if (adminId === targetUserId) {
      throw new BadRequestError('Admins cannot delete their own account');
    }

    // Safety Rule 2: Cannot delete the last active administrator
    if (existing.role === 'admin') {
      const remainingAdmins = await userRepository.countActiveAdmins(targetUserId);
      if (remainingAdmins <= 0) {
        throw new BadRequestError(
          'Cannot delete administrator: system must retain at least one active administrator',
        );
      }
    }

    await userRepository.softDelete(targetUserId);

    await auditLogRepository.log({
      admin_id: adminId,
      action: 'DELETE',
      resource_type: 'USER',
      resource_id: targetUserId,
      metadata: { email: existing.email },
    });
  }

  // ==========================================
  // EXISTING ORDERS & METRICS
  // ==========================================

  async getOrders(page = 1, limit = 20, status?: string): Promise<PaginatedResult<Order>> {
    return orderRepository.findAll(page, limit, status);
  }

  async updateOrderStatus(id: string, status?: string, paymentStatus?: string): Promise<Order> {
    const updated = await orderRepository.updateStatus(id, status, paymentStatus);
    if (!updated) {
      throw new NotFoundError('Order not found');
    }
    return updated;
  }

  async getDashboardStats(): Promise<any> {
    const [salesRes, ordersRes, productsRes, usersRes, lowStockRes] = await Promise.all([
      db.query<{ total_sales: string }>(
        `SELECT COALESCE(SUM(total_amount), 0) as total_sales FROM orders WHERE payment_status = 'paid'`,
      ),
      db.query<{ total_orders: string; pending_orders: string }>(
        `SELECT 
           COUNT(*) as total_orders,
           COUNT(*) FILTER (WHERE status = 'pending') as pending_orders
         FROM orders`,
      ),
      db.query<{ total_products: string }>(
        `SELECT COUNT(*) as total_products FROM products WHERE is_active = true AND deleted_at IS NULL`,
      ),
      db.query<{ total_customers: string }>(
        `SELECT COUNT(*) as total_customers FROM users WHERE role = 'customer' AND deleted_at IS NULL`,
      ),
      db.query<any>(
        `SELECT pv.sku, pv.title, p.title as product_title, pv.stock_quantity
         FROM product_variants pv
         JOIN products p ON pv.product_id = p.id
         WHERE pv.stock_quantity < 5 AND pv.is_active = true AND p.deleted_at IS NULL
         ORDER BY pv.stock_quantity ASC
         LIMIT 10`,
      ),
    ]);

    return {
      totalSales: parseFloat(salesRes.rows[0]?.total_sales || '0'),
      totalOrders: parseInt(ordersRes.rows[0]?.total_orders || '0', 10),
      pendingOrders: parseInt(ordersRes.rows[0]?.pending_orders || '0', 10),
      totalProducts: parseInt(productsRes.rows[0]?.total_products || '0', 10),
      totalCustomers: parseInt(usersRes.rows[0]?.total_customers || '0', 10),
      lowStockVariants: lowStockRes.rows,
    };
  }
}

export const adminService = new AdminService();
