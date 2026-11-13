import { productRepository } from '../repositories/product.repository';
import { PaginatedResult, Product, ProductDetail, ProductFilterQuery } from '../types';
import { NotFoundError } from '../utils/errors';

export class ProductService {
  async getProducts(query: ProductFilterQuery): Promise<PaginatedResult<Product>> {
    return productRepository.findMany(query);
  }

  async getProductBySlug(slug: string): Promise<ProductDetail> {
    const product = await productRepository.findBySlug(slug);
    if (!product) {
      throw new NotFoundError(`Product '${slug}' not found`);
    }
    return product;
  }

  async getRelatedProducts(slug: string, limit = 4): Promise<Product[]> {
    const product = await productRepository.findBySlug(slug);
    if (!product) {
      throw new NotFoundError(`Product '${slug}' not found`);
    }
    return productRepository.findRelated(product.category_id, product.id, limit);
  }
}

export const productService = new ProductService();

