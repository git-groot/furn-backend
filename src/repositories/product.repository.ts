import { db } from '../config/database';
import {
  AdminProductFilterQuery,
  PaginatedResult,
  Product,
  ProductDetail,
  ProductFilterQuery,
  ProductImage,
  ProductVariant,
} from '../types';
import { QueryBuilder } from '../utils/queryBuilder';

export class ProductRepository {
  /**
   * Public Product Catalog Search & Filter (Excludes soft-deleted and inactive products)
   */
  async findMany(query: ProductFilterQuery): Promise<PaginatedResult<Product>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 12));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['p.is_active = true', 'p.deleted_at IS NULL'];
    const params: any[] = [];
    let paramIndex = 1;

    if (query.category) {
      conditions.push(`(c.slug = $${paramIndex} OR c.name ILIKE $${paramIndex})`);
      params.push(query.category);
      paramIndex++;
    }

    if (query.wood_type) {
      conditions.push(`(p.primary_material ILIKE $${paramIndex} OR EXISTS (
        SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.wood_type ILIKE $${paramIndex}
      ))`);
      params.push(`%${query.wood_type}%`);
      paramIndex++;
    }

    if (query.min_price !== undefined) {
      conditions.push(`p.base_price >= $${paramIndex}`);
      params.push(query.min_price);
      paramIndex++;
    }

    if (query.max_price !== undefined) {
      conditions.push(`p.base_price <= $${paramIndex}`);
      params.push(query.max_price);
      paramIndex++;
    }

    if (query.search) {
      conditions.push(
        `(p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex})`,
      );
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    if (query.featured !== undefined) {
      conditions.push(`p.is_featured = $${paramIndex}`);
      params.push(query.featured);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let sortClause = 'ORDER BY p.created_at DESC';
    switch (query.sort) {
      case 'price_asc':
        sortClause = 'ORDER BY p.base_price ASC';
        break;
      case 'price_desc':
        sortClause = 'ORDER BY p.base_price DESC';
        break;
      case 'rating':
        sortClause = 'ORDER BY avg_rating DESC NULLS LAST, p.created_at DESC';
        break;
      case 'title_asc':
        sortClause = 'ORDER BY p.title ASC';
        break;
      case 'title_desc':
        sortClause = 'ORDER BY p.title DESC';
        break;
      case 'newest':
      default:
        sortClause = 'ORDER BY p.created_at DESC';
        break;
    }

    const countSql = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
    `;
    const countRes = await db.query<{ total: string }>(countSql, params);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const dataSql = `
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        (
          SELECT pi.image_url 
          FROM product_images pi 
          WHERE pi.product_id = p.id 
          ORDER BY pi.is_primary DESC, pi.display_order ASC 
          LIMIT 1
        ) as primary_image,
        COALESCE(
          (SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved'),
          0
        )::float as avg_rating,
        COALESCE(
          (SELECT COUNT(r.id) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved'),
          0
        )::int as review_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ${sortClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataParams = [...params, limit, offset];
    const dataRes = await db.query<Product>(dataSql, dataParams);
    return QueryBuilder.formatPaginatedResult(dataRes.rows, total, page, limit);
  }

  /**
   * Admin Product Catalog Listing (Supports filtering by active/inactive/deleted, stock levels, search, and sorting)
   */
  async findAdminProducts(query: AdminProductFilterQuery): Promise<PaginatedResult<Product>> {
    const { page, limit, offset } = QueryBuilder.getPagination(query);

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (query.status === 'active') {
      conditions.push('p.is_active = true AND p.deleted_at IS NULL');
    } else if (query.status === 'inactive') {
      conditions.push('p.is_active = false AND p.deleted_at IS NULL');
    } else if (query.status === 'deleted') {
      conditions.push('p.deleted_at IS NOT NULL');
    } else if (query.status === 'all') {
      // Include all records
    } else {
      conditions.push('p.deleted_at IS NULL');
    }

    if (query.category) {
      conditions.push(
        `(c.slug = $${paramIndex} OR c.name ILIKE $${paramIndex} OR p.category_id::text = $${paramIndex})`,
      );
      params.push(query.category);
      paramIndex++;
    }

    if (query.search) {
      conditions.push(
        `(p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex})`,
      );
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    if (query.stock === 'out_of_stock') {
      conditions.push(
        `COALESCE((SELECT SUM(stock_quantity) FROM product_variants WHERE product_id = p.id), 0) = 0`,
      );
    } else if (query.stock === 'low_stock') {
      conditions.push(
        `COALESCE((SELECT SUM(stock_quantity) FROM product_variants WHERE product_id = p.id), 0) BETWEEN 1 AND 5`,
      );
    } else if (query.stock === 'in_stock') {
      conditions.push(
        `COALESCE((SELECT SUM(stock_quantity) FROM product_variants WHERE product_id = p.id), 0) > 5`,
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sortColumns: Record<string, string> = {
      price: 'p.base_price',
      created_at: 'p.created_at',
      name: 'p.title',
      title: 'p.title',
    };
    const sortClause = QueryBuilder.buildSortClause(query.sort, query.order, sortColumns, 'created_at');

    const countSql = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
    `;
    const countRes = await db.query<{ total: string }>(countSql, params);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const dataSql = `
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        (
          SELECT pi.image_url 
          FROM product_images pi 
          WHERE pi.product_id = p.id 
          ORDER BY pi.is_primary DESC, pi.display_order ASC 
          LIMIT 1
        ) as primary_image,
        COALESCE((SELECT SUM(pv.stock_quantity) FROM product_variants pv WHERE pv.product_id = p.id), 0)::int as total_stock,
        COALESCE((SELECT COUNT(pv.id) FROM product_variants pv WHERE pv.product_id = p.id), 0)::int as variant_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ${sortClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataRes = await db.query<Product>(dataSql, [...params, limit, offset]);
    return QueryBuilder.formatPaginatedResult(dataRes.rows, total, page, limit);
  }

  async findBySlug(slug: string): Promise<ProductDetail | null> {
    const productSql = `
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        COALESCE(
          (SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved'),
          0
        )::float as avg_rating,
        COALESCE(
          (SELECT COUNT(r.id) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved'),
          0
        )::int as review_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = $1 AND p.is_active = true AND p.deleted_at IS NULL
    `;
    const prodRes = await db.query<Product>(productSql, [slug]);
    if (prodRes.rows.length === 0) return null;
    const base = prodRes.rows[0];

    const [imagesRes, variantsRes] = await Promise.all([
      db.query<ProductImage>(
        `SELECT * FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC, display_order ASC`,
        [base.id],
      ),
      db.query<ProductVariant>(
        `SELECT * FROM product_variants WHERE product_id = $1 AND is_active = true ORDER BY price ASC`,
        [base.id],
      ),
    ]);

    return {
      ...base,
      images: imagesRes.rows,
      variants: variantsRes.rows,
      specifications: {
        dimensions: base.dimensions,
        primary_material: base.primary_material,
        secondary_material: base.secondary_material,
        finish: base.finish,
        assembly_required: base.assembly_required,
        dispatch_time: base.dispatch_time,
        warranty: base.warranty,
        care_guide: base.care_guide,
        country_of_origin: 'India',
      },
    };
  }

  async findById(id: string): Promise<Product | null> {
    const res = await db.query<Product>(
      'SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
    return res.rows[0] || null;
  }

  async findAdminProductById(
    id: string,
  ): Promise<(Product & { images: ProductImage[]; variants: ProductVariant[] }) | null> {
    const prodRes = await db.query<Product>(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1`,
      [id],
    );
    if (prodRes.rows.length === 0) return null;
    const base = prodRes.rows[0];

    const [imagesRes, variantsRes] = await Promise.all([
      db.query<ProductImage>(
        `SELECT * FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC, display_order ASC`,
        [base.id],
      ),
      db.query<ProductVariant>(
        `SELECT * FROM product_variants WHERE product_id = $1 ORDER BY created_at ASC`,
        [base.id],
      ),
    ]);

    return {
      ...base,
      images: imagesRes.rows,
      variants: variantsRes.rows,
    };
  }

  async findBySku(sku: string): Promise<Product | null> {
    const res = await db.query<Product>('SELECT * FROM products WHERE sku = $1', [sku]);
    return res.rows[0] || null;
  }

  async findBySlugAny(slug: string): Promise<Product | null> {
    const res = await db.query<Product>('SELECT * FROM products WHERE slug = $1', [slug]);
    return res.rows[0] || null;
  }

  async hasOrderItems(productId: string): Promise<boolean> {
    const res = await db.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM order_items WHERE product_id = $1',
      [productId],
    );
    return parseInt(res.rows[0]?.count || '0', 10) > 0;
  }

  async findRelated(categoryId: string, excludeProductId: string, limit = 4): Promise<Product[]> {
    const sql = `
      SELECT 
        p.*,
        (
          SELECT pi.image_url 
          FROM product_images pi 
          WHERE pi.product_id = p.id 
          ORDER BY pi.is_primary DESC, pi.display_order ASC 
          LIMIT 1
        ) as primary_image,
        COALESCE(
          (SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved'),
          0
        )::float as avg_rating,
        COALESCE(
          (SELECT COUNT(r.id) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved'),
          0
        )::int as review_count
      FROM products p
      WHERE p.category_id = $1 AND p.id != $2 AND p.is_active = true AND p.deleted_at IS NULL
      ORDER BY p.is_featured DESC, p.created_at DESC
      LIMIT $3
    `;
    const res = await db.query<Product>(sql, [categoryId, excludeProductId, limit]);
    return res.rows;
  }

  async create(data: any): Promise<Product> {
    const res = await db.query<Product>(
      `INSERT INTO products (
        category_id, title, slug, sku, short_description, description,
        base_price, compare_at_price, primary_material, secondary_material,
        dimensions, assembly_required, finish, dispatch_time, warranty,
        care_guide, is_featured, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        data.category_id,
        data.title,
        data.slug,
        data.sku,
        data.short_description || null,
        data.description,
        data.base_price,
        data.compare_at_price || null,
        data.primary_material,
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
    return res.rows[0];
  }

  async update(id: string, data: Partial<Product>): Promise<Product | null> {
    const keys = Object.keys(data);
    if (keys.length === 0) return this.findById(id);

    const setClauses = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = Object.values(data);
    values.push(id);

    const query = `UPDATE products SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} AND deleted_at IS NULL RETURNING *`;
    const res = await db.query<Product>(query, values);
    return res.rows[0] || null;
  }

  async softDelete(id: string): Promise<boolean> {
    const res = await db.query(
      `UPDATE products 
       SET deleted_at = CURRENT_TIMESTAMP, is_active = false, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND deleted_at IS NULL 
       RETURNING id`,
      [id],
    );
    return (res.rowCount || 0) > 0;
  }

  async bulkUpdateStatus(ids: string[], isActive: boolean): Promise<number> {
    const res = await db.query(
      `UPDATE products 
       SET is_active = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ANY($2::uuid[]) AND deleted_at IS NULL`,
      [isActive, ids],
    );
    return res.rowCount || 0;
  }
}

export const productRepository = new ProductRepository();
