import { cartRepository } from '../repositories/cart.repository';
import { productRepository } from '../repositories/product.repository';
import { CartWithItems } from '../types';
import { BadRequestError, NotFoundError } from '../utils/errors';

export class CartService {
  async getCart(userId?: string, sessionToken?: string): Promise<CartWithItems> {
    const cart = await cartRepository.findOrCreateCart(userId, sessionToken);
    const cartWithItems = await cartRepository.getCartWithItems(cart.id);
    return (
      cartWithItems || {
        ...cart,
        items: [],
        subtotal: 0,
        total_items: 0,
      }
    );
  }

  async addItem(data: {
    userId?: string;
    sessionToken?: string;
    productId: string;
    variantId?: string | null;
    quantity: number;
  }): Promise<CartWithItems> {
    const product = await productRepository.findById(data.productId);
    if (!product || !product.is_active) {
      throw new NotFoundError('Product not found or unavailable');
    }

    const cart = await cartRepository.findOrCreateCart(data.userId, data.sessionToken);
    await cartRepository.addItem(cart.id, data.productId, data.variantId || null, data.quantity);

    return this.getCart(data.userId, data.sessionToken);
  }

  async updateQuantity(
    cartItemId: string,
    quantity: number,
    userId?: string,
    sessionToken?: string,
  ): Promise<CartWithItems> {
    if (quantity <= 0) {
      throw new BadRequestError('Quantity must be greater than zero');
    }

    const updated = await cartRepository.updateItemQuantity(cartItemId, quantity);
    if (!updated) {
      throw new NotFoundError('Cart item not found');
    }

    return this.getCart(userId, sessionToken);
  }

  async removeItem(
    cartItemId: string,
    userId?: string,
    sessionToken?: string,
  ): Promise<CartWithItems> {
    const removed = await cartRepository.removeItem(cartItemId);
    if (!removed) {
      throw new NotFoundError('Cart item not found');
    }

    return this.getCart(userId, sessionToken);
  }

  async clearCart(userId?: string, sessionToken?: string): Promise<void> {
    const cart = await cartRepository.findOrCreateCart(userId, sessionToken);
    await cartRepository.clearCart(cart.id);
  }
}

export const cartService = new CartService();
