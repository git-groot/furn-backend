import { db } from '../config/database';
import { Cart, CartItem, CartWithItems } from '../types';

export class CartRepository {
  async findOrCreateCart(userId?: string, sessionToken?: string): Promise<Cart> {
    if (userId) {
      const userCart = await db.query<Cart>('SELECT * FROM carts WHERE user_id = $1 LIMIT 1', [
        userId,
      ]);
      if (userCart.rows[0]) return userCart.rows[0];

      const newCart = await db.query<Cart>('INSERT INTO carts (user_id) VALUES ($1) RETURNING *', [
        userId,
      ]);
      return newCart.rows[0];
    }

    if (sessionToken) {
      const sessionCart = await db.query<Cart>(
        'SELECT * FROM carts WHERE session_token = $1 LIMIT 1',
        [sessionToken],
      );
      if (sessionCart.rows[0]) return sessionCart.rows[0];

      const newCart = await db.query<Cart>(
        'INSERT INTO carts (session_token) VALUES ($1) RETURNING *',
        [sessionToken],
      );
      return newCart.rows[0];
    }

    // Fallback: create fresh anonymous cart
    const newCart = await db.query<Cart>('INSERT INTO carts DEFAULT VALUES RETURNING *');
    return newCart.rows[0];
  }

  async getCartWithItems(cartId: string): Promise<CartWithItems | null> {
    const cartRes = await db.query<Cart>('SELECT * FROM carts WHERE id = $1', [cartId]);
    if (cartRes.rows.length === 0) return null;
    const cart = cartRes.rows[0];

    const itemsSql = `
      SELECT 
        ci.*,
        p.title as product_title,
        p.slug as product_slug,
        pv.title as variant_title,
        pv.wood_type,
        pv.size,
        COALESCE(pv.price, p.base_price)::float as unit_price,
        COALESCE(pv.compare_at_price, p.compare_at_price)::float as compare_at_price,
        COALESCE(pv.stock_quantity, 10) as stock_quantity,
        (
          SELECT pi.image_url 
          FROM product_images pi 
          WHERE pi.product_id = p.id 
          ORDER BY pi.is_primary DESC, pi.display_order ASC 
          LIMIT 1
        ) as image_url
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_variants pv ON ci.variant_id = pv.id
      WHERE ci.cart_id = $1
      ORDER BY ci.created_at ASC
    `;
    const itemsRes = await db.query<CartItem>(itemsSql, [cartId]);

    const items = itemsRes.rows;
    const subtotal = items.reduce((sum, item) => sum + (item.unit_price || 0) * item.quantity, 0);
    const total_items = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      ...cart,
      items,
      subtotal,
      total_items,
    };
  }

  async addItem(
    cartId: string,
    productId: string,
    variantId: string | null,
    quantity: number,
  ): Promise<CartItem> {
    const sql = `
      INSERT INTO cart_items (cart_id, product_id, variant_id, quantity)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (cart_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid))
      DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    // If table constraint allows null variant_id, standard query with conditional:
    const existing = await db.query<CartItem>(
      `SELECT * FROM cart_items 
       WHERE cart_id = $1 AND product_id = $2 AND (variant_id = $3 OR (variant_id IS NULL AND $3 IS NULL))`,
      [cartId, productId, variantId],
    );

    if (existing.rows.length > 0) {
      const updated = await db.query<CartItem>(
        `UPDATE cart_items SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
        [quantity, existing.rows[0].id],
      );
      return updated.rows[0];
    } else {
      const inserted = await db.query<CartItem>(
        `INSERT INTO cart_items (cart_id, product_id, variant_id, quantity) VALUES ($1, $2, $3, $4) RETURNING *`,
        [cartId, productId, variantId, quantity],
      );
      return inserted.rows[0];
    }
  }

  async updateItemQuantity(cartItemId: string, quantity: number): Promise<CartItem | null> {
    const res = await db.query<CartItem>(
      'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [quantity, cartItemId],
    );
    return res.rows[0] || null;
  }

  async removeItem(cartItemId: string): Promise<boolean> {
    const res = await db.query('DELETE FROM cart_items WHERE id = $1', [cartItemId]);
    return (res.rowCount || 0) > 0;
  }

  async clearCart(cartId: string): Promise<void> {
    await db.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
  }
}

export const cartRepository = new CartRepository();
