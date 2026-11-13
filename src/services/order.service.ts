import { db } from '../config/database';
import { addressRepository } from '../repositories/address.repository';
import { cartRepository } from '../repositories/cart.repository';
import { orderRepository } from '../repositories/order.repository';
import { OrderAddressSnapshot, OrderWithItems, PaginatedResult } from '../types';
import { BadRequestError, NotFoundError } from '../utils/errors';

export class OrderService {
  async createOrder(
    userId: string,
    data: {
      addressId?: string;
      shippingAddress?: OrderAddressSnapshot;
      paymentMethod: string;
      notes?: string;
      sessionToken?: string;
    },
  ): Promise<OrderWithItems> {
    // 1. Resolve shipping address
    let addressSnapshot: OrderAddressSnapshot;
    if (data.addressId) {
      const savedAddr = await addressRepository.findById(data.addressId);
      if (!savedAddr || savedAddr.user_id !== userId) {
        throw new NotFoundError('Selected delivery address not found');
      }
      addressSnapshot = {
        full_name: savedAddr.full_name,
        phone: savedAddr.phone,
        address_line1: savedAddr.address_line1,
        address_line2: savedAddr.address_line2,
        city: savedAddr.city,
        state: savedAddr.state,
        postal_code: savedAddr.postal_code,
        country: savedAddr.country,
      };
    } else if (data.shippingAddress) {
      addressSnapshot = data.shippingAddress;
    } else {
      throw new BadRequestError('Shipping address is required to place an order');
    }

    // 2. Fetch current cart
    const cart = await cartRepository.findOrCreateCart(userId, data.sessionToken);
    const cartWithItems = await cartRepository.getCartWithItems(cart.id);

    if (!cartWithItems || cartWithItems.items.length === 0) {
      throw new BadRequestError('Your cart is empty. Please add items before checkout.');
    }

    // 3. Compute pricing (Free delivery on orders above ₹15,000)
    const subtotal = cartWithItems.subtotal;
    const shipping_amount = subtotal >= 15000 ? 0 : 999;
    const tax_amount = Math.round(subtotal * 0.12); // 12% furniture GST
    const discount_amount = 0;
    const total_amount = subtotal + shipping_amount + tax_amount - discount_amount;

    // 4. Generate human-readable order number
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const order_number = `MF-${dateStr}-${randomSuffix}`;

    // 5. Execute atomic transaction
    const createdOrder = await db.transaction(async (client) => {
      // Create master order record
      const order = await orderRepository.createOrder(client, {
        order_number,
        user_id: userId,
        subtotal,
        tax_amount,
        shipping_amount,
        discount_amount,
        total_amount,
        payment_method: data.paymentMethod,
        shipping_address_snapshot: addressSnapshot,
        notes: data.notes,
      });

      // Insert line items & deduct inventory
      for (const item of cartWithItems.items) {
        const itemPrice = item.unit_price || 0;
        const lineTotal = itemPrice * item.quantity;

        await orderRepository.createOrderItem(client, {
          order_id: order.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          product_title: item.product_title || 'Furniture Item',
          variant_title: item.variant_title,
          sku: item.wood_type || 'MF-SKU',
          unit_price: itemPrice,
          quantity: item.quantity,
          total_price: lineTotal,
          image_url: item.image_url,
        });

        // Deduct variant stock if variant exists
        if (item.variant_id) {
          const updateRes = await client.query(
            `UPDATE product_variants 
             SET stock_quantity = GREATEST(0, stock_quantity - $1)
             WHERE id = $2`,
            [item.quantity, item.variant_id],
          );
          if (updateRes.rowCount === 0) {
            throw new BadRequestError(`Variant stock update failed for item ${item.product_title}`);
          }
        }
      }

      // Clear cart items
      await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cart.id]);

      return order;
    });

    const fullOrder = await orderRepository.findById(createdOrder.id);
    return fullOrder!;
  }

  async getUserOrders(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedResult<OrderWithItems>> {
    return orderRepository.findByUserId(userId, page, limit);
  }

  async getOrderDetails(
    orderId: string,
    userId?: string,
    isAdmin = false,
  ): Promise<OrderWithItems> {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (!isAdmin && userId && order.user_id !== userId) {
      throw new NotFoundError('Order not found');
    }

    return order;
  }
}

export const orderService = new OrderService();
