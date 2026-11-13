import { db } from '../config/database';
import { Category } from '../types';

export class CategoryRepository {
  async findAll(): Promise<Category[]> {
    const res = await db.query<Category>(
      `SELECT * FROM categories WHERE is_active = true ORDER BY display_order ASC, name ASC`,
    );
    return res.rows;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const res = await db.query<Category>(
      `SELECT * FROM categories WHERE slug = $1 AND is_active = true`,
      [slug],
    );
    return res.rows[0] || null;
  }

  async findById(id: string): Promise<Category | null> {
    const res = await db.query<Category>(`SELECT * FROM categories WHERE id = $1`, [id]);
    return res.rows[0] || null;
  }

  async create(data: {
    name: string;
    slug: string;
    description?: string;
    image_url?: string;
    parent_id?: string | null;
    display_order?: number;
  }): Promise<Category> {
    const res = await db.query<Category>(
      `INSERT INTO categories (name, slug, description, image_url, parent_id, display_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.name,
        data.slug,
        data.description || null,
        data.image_url || null,
        data.parent_id || null,
        data.display_order || 0,
      ],
    );
    return res.rows[0];
  }
}

export const categoryRepository = new CategoryRepository();
