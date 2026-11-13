import { categoryRepository } from '../repositories/category.repository';
import { Category } from '../types';
import { NotFoundError } from '../utils/errors';

export class CategoryService {
  async getAll(): Promise<Category[]> {
    const categories = await categoryRepository.findAll();

    // Build hierarchical tree if subcategories exist
    const map = new Map<string, Category>();
    const roots: Category[] = [];

    categories.forEach((cat) => {
      map.set(cat.id, { ...cat, subcategories: [] });
    });

    categories.forEach((cat) => {
      const current = map.get(cat.id)!;
      if (cat.parent_id && map.has(cat.parent_id)) {
        map.get(cat.parent_id)!.subcategories!.push(current);
      } else {
        roots.push(current);
      }
    });

    return roots;
  }

  async getBySlug(slug: string): Promise<Category> {
    const category = await categoryRepository.findBySlug(slug);
    if (!category) {
      throw new NotFoundError(`Category '${slug}' not found`);
    }
    return category;
  }
}

export const categoryService = new CategoryService();

