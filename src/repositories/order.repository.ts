import { PoolClient } from 'pg';
import { db } from '../config/database';
import { Order, OrderItem, OrderWithItems, PaginatedResult } from '../types';

export class OrderRepository {
  async createOrder(
    client: PoolClient,
    orderData: {
      order_number: string;
      user_id: string;
      subtotal: number;
      tax_amount: number;
      shipping_amount: number;
      discount_amount: number;
      total_amount: number;
      payment_method: string;
      shipping_address_snapshot: any;
      notes?: string;
    },
  ): Promise<Order> {
    const res = await client.query<Order>(
      `INSERT INTO orders (
        order_number, user_id, subtotal, tax_amount, shipping_amount,
        discount_amount, total_amount, payment_method, shipping_address_snapshot, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        orderData.order_number,
        orderData.user_id,
        orderData.subtotal,
        orderData.tax_amount,
        orderData.shipping_amount,
        orderData.discount_amount,
        orderData.total_amount,
        orderData.payment_method,
        JSON.stringify(orderData.shipping_address_snapshot),
        orderData.notes || null,
      ],
    );
    return res.rows[0];
  }

  async createOrderItem(
    client: PoolClient,
    itemData: {
      order_id: string;
      product_id: string;
      variant_id?: string | null;
      product_title: string;
      variant_title?: string;
      sku: string;
      unit_price: number;
      quantity: number;
      total_price: number;
      image_url?: string;
    },
  ): Promise<OrderItem> {
    const res = await client.query<OrderItem>(
      `INSERT INTO order_items (
        order_id, product_id, variant_id, product_title, variant_title,
        sku, unit_price, quantity, total_price, image_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        itemData.order_id,
        itemData.product_id,
        itemData.variant_id || null,
        itemData.product_title,
        itemData.variant_title || null,
        itemData.sku,
        itemData.unit_price,
        itemData.quantity,
        itemData.total_price,
        itemData.image_url || null,
      ],
    );
    return res.rows[0];
  }

  async findById(id: string): Promise<OrderWithItems | null> {
    const orderRes = await db.query<Order>('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderRes.rows.length === 0) return null;

    const itemsRes = await db.query<OrderItem>(
      'SELECT * FROM order_items WHERE order_id = $1 ORDER BY product_title ASC',
      [id],
    );

    return {
      ...orderRes.rows[0],
      items: itemsRes.rows,
    };
  }

  async findByUserId(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedResult<OrderWithItems>> {
    const offset = (page - 1) * limit;

    const countRes = await db.query<{ total: string }>(
      'SELECT COUNT(*) as total FROM orders WHERE user_id = $1',
      [userId],
    );
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const ordersRes = await db.query<Order>(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset],
    );

    const orders = ordersRes.rows;
    const ordersWithItems: OrderWithItems[] = [];

    for (const order of orders) {
      const itemsRes = await db.query<OrderItem>('SELECT * FROM order_items WHERE order_id = $1', [
        order.id,
      ]);
      ordersWithItems.push({
        ...order,
        items: itemsRes.rows,
      });
    }

    const totalPages = Math.ceil(total / limit);

    return {
      data: ordersWithItems,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findAll(page = 1, limit = 20, status?: string): Promise<PaginatedResult<Order>> {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (status) {
      conditions.push(`status = $${pIdx++}`);
      params.push(status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await db.query<{ total: string }>(
      `SELECT COUNT(*) as total FROM orders ${where}`,
      params,
    );
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const dataRes = await db.query<Order>(
      `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT $${pIdx++} OFFSET $${pIdx}`,
      [...params, limit, offset],
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data: dataRes.rows,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async updateStatus(id: string, status?: string, paymentStatus?: string): Promise<Order | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (status) {
      fields.push(`status = $${idx++}`);
      values.push(status);
    }
    if (paymentStatus) {
      fields.push(`payment_status = $${idx++}`);
      values.push(paymentStatus);
    }

    if (fields.length === 0) {
      const res = await db.query<Order>('SELECT * FROM orders WHERE id = $1', [id]);
      return res.rows[0] || null;
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE orders SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const res = await db.query<Order>(query, values);
    return res.rows[0] || null;
  }
}

export const orderRepository = new OrderRepository();
