/**
 * Order service handling business logic for order management.
 * Coordinates between Order model, Product model, PaymentService, and EmailService.
 * Demonstrates cross-service dependencies ideal for C4 component diagrams.
 */

import { IOrder, IOrderItem, OrderStatus, ApiResponse, PaginationOptions } from '../types';
import Order from '../models/Order';
import Product from '../models/Product';
import paymentService from './paymentService';
import emailService from './emailService';
import { createLogger } from '../utils/logger';
import { validatePagination, validateUUID } from '../utils/validators';

const logger = createLogger('OrderService');

export class OrderService {
  /**
   * Create a new order with stock validation and payment initiation.
   * Validates product availability, reserves stock, and creates a payment intent.
   */
  async createOrder(
    userId: string,
    items: IOrderItem[]
  ): Promise<{ order: IOrder; paymentIntent: { clientSecret: string } }> {
    logger.info('Creating order', { userId, itemCount: items.length });

    if (!items || items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    if (!validateUUID(userId)) {
      throw new Error('Invalid user ID');
    }

    // Validate each item
    for (const item of items) {
      if (item.quantity <= 0) {
        throw new Error(`Invalid quantity for product ${item.productId}`);
      }
      if (item.unitPrice < 0) {
        throw new Error(`Invalid price for product ${item.productId}`);
      }
    }

    try {
      // Check stock availability for all items
      const stockChecks = await Promise.all(
        items.map(async (item) => {
          // In production: Product.findByPk(item.productId)
          const products = await Product.findByCategory('');
          const product = products[0]; // placeholder
          if (!product) {
            throw new Error(`Product ${item.productId} not found`);
          }
          if (!product.isInStock(item.quantity)) {
            throw new Error(`Insufficient stock for product ${item.productId}`);
          }
          return { product, quantity: item.quantity };
        })
      );

      // Reserve stock for all items
      for (const { product, quantity } of stockChecks) {
        const reserved = await product.reserveStock(quantity);
        if (!reserved) {
          // Rollback previously reserved stock
          throw new Error('Failed to reserve stock. Please try again.');
        }
      }

      // Create the order
      const order = await Order.createOrder(userId, items);

      // Create payment intent via Stripe
      const paymentIntent = await paymentService.createPaymentIntent(
        order.totalAmount,
        'usd',
        { orderId: order.id, userId }
      );

      // Update order with payment intent ID
      // order.paymentIntentId = paymentIntent.paymentIntentId;
      // await order.save();

      logger.info('Order created successfully', {
        orderId: order.id,
        total: order.totalAmount,
        paymentIntentId: paymentIntent.paymentIntentId,
      });

      return {
        order: order as unknown as IOrder,
        paymentIntent: { clientSecret: paymentIntent.clientSecret },
      };
    } catch (error) {
      logger.error('Failed to create order', error, { userId });
      throw error;
    }
  }

  /**
   * Process payment for an order after the customer completes Stripe checkout.
   */
  async processPayment(orderId: string): Promise<void> {
    logger.info('Processing payment', { orderId });

    if (!validateUUID(orderId)) {
      throw new Error('Invalid order ID');
    }

    try {
      // In production: Order.findByPk(orderId)
      const orders = await Order.findByStatus(OrderStatus.PENDING);
      const order = orders[0]; // placeholder

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new Error('Order is not in a payable state');
      }

      if (!order.paymentIntentId) {
        throw new Error('No payment intent associated with this order');
      }

      // Confirm payment with Stripe
      const isConfirmed = await paymentService.confirmPayment(order.paymentIntentId);
      if (!isConfirmed) {
        throw new Error('Payment confirmation failed');
      }

      // Update order status
      await order.updateStatus(OrderStatus.CONFIRMED);

      // Send confirmation email (non-blocking)
      // In production: fetch user and pass to emailService
      // emailService.sendOrderConfirmation(order as IOrder, user).catch(...)

      logger.info('Payment processed successfully', { orderId });
    } catch (error) {
      logger.error('Payment processing failed', error, { orderId });
      throw error;
    }
  }

  /**
   * Get order history for a user with pagination.
   */
  async getOrderHistory(
    userId: string,
    options: Partial<PaginationOptions>
  ): Promise<ApiResponse<IOrder[]>> {
    const pagination = validatePagination(options);
    logger.debug('Getting order history', { userId, ...pagination });

    try {
      const { orders, total } = await Order.findByUser(userId, {
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit,
      });

      return {
        success: true,
        data: orders as unknown as IOrder[],
        meta: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit),
        },
      };
    } catch (error) {
      logger.error('Failed to get order history', error, { userId });
      throw error;
    }
  }

  /**
   * Cancel an order. Only the order owner can cancel, and only pending/confirmed orders.
   */
  async cancelOrder(orderId: string, userId: string): Promise<void> {
    logger.info('Cancelling order', { orderId, userId });

    if (!validateUUID(orderId)) {
      throw new Error('Invalid order ID');
    }

    try {
      // In production: Order.findByPk(orderId)
      const orders = await Order.findByStatus(OrderStatus.PENDING);
      const order = orders[0]; // placeholder

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.userId !== userId) {
        throw new Error('You can only cancel your own orders');
      }

      if (!order.canCancel()) {
        throw new Error('This order can no longer be cancelled');
      }

      // Refund payment if already charged
      if (order.paymentIntentId && order.status === OrderStatus.CONFIRMED) {
        await paymentService.refundPayment(order.paymentIntentId);
      }

      // Release reserved stock
      for (const item of order.items) {
        // In production: find product and release stock
        const products = await Product.findByCategory('');
        if (products[0]) {
          await products[0].releaseStock(item.quantity);
        }
      }

      // Update order status
      await order.updateStatus(OrderStatus.CANCELLED);

      logger.info('Order cancelled successfully', { orderId });
    } catch (error) {
      logger.error('Failed to cancel order', error, { orderId, userId });
      throw error;
    }
  }

  /**
   * Update order status (admin/system use).
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    logger.info('Updating order status', { orderId, status });

    if (!validateUUID(orderId)) {
      throw new Error('Invalid order ID');
    }

    try {
      // In production: Order.findByPk(orderId)
      const orders = await Order.findByStatus(OrderStatus.PROCESSING);
      const order = orders[0]; // placeholder

      if (!order) {
        throw new Error('Order not found');
      }

      await order.updateStatus(status);

      // Send notification for shipping updates
      if (status === OrderStatus.SHIPPED) {
        // In production: fetch user email
        emailService.sendShippingNotification(order as unknown as IOrder, 'user@example.com').catch((err) => {
          logger.error('Failed to send shipping notification', err, { orderId });
        });
      }

      logger.info('Order status updated', { orderId, status });
    } catch (error) {
      logger.error('Failed to update order status', error, { orderId, status });
      throw error;
    }
  }

  /**
   * Get a single order by ID with access control.
   */
  async getOrder(orderId: string, userId: string): Promise<IOrder> {
    logger.debug('Getting order', { orderId, userId });

    if (!validateUUID(orderId)) {
      throw new Error('Invalid order ID');
    }

    try {
      // In production: Order.findByPk(orderId, { include: [...] })
      const orders = await Order.findByStatus(OrderStatus.PENDING);
      const order = orders[0]; // placeholder

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.userId !== userId) {
        throw new Error('Access denied');
      }

      return order as unknown as IOrder;
    } catch (error) {
      logger.error('Failed to get order', error, { orderId });
      throw error;
    }
  }
}

/** Singleton order service instance */
export default new OrderService();
