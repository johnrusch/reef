/**
 * Order model representing customer orders.
 * Tracks order lifecycle from creation through delivery.
 */

import { IOrder, IOrderItem, OrderStatus } from '../types';
import { BaseModel } from './User';
import { createLogger } from '../utils/logger';

const logger = createLogger('OrderModel');

/**
 * Order model with full lifecycle management.
 * Belongs to User, contains OrderItems referencing Products.
 */
export class Order extends BaseModel {
  public userId!: string;
  public items!: IOrderItem[];
  public status!: OrderStatus;
  public totalAmount!: number;
  public paymentIntentId?: string;
  public shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  public notes?: string;

  /**
   * Define model associations.
   * Order belongsTo User, hasMany OrderItems through Product.
   */
  static associate(models: {
    User: typeof import('./User').User;
    Product: typeof import('./Product').Product;
  }): void {
    logger.debug('Associating Order model', {
      associations: ['belongsTo:User', 'belongsToMany:Product'],
    });
    // Order.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    // Order.belongsToMany(models.Product, { through: 'OrderItems', as: 'products' });
  }

  /**
   * Find all orders for a specific user.
   */
  static async findByUser(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ orders: Order[]; total: number }> {
    logger.debug('Finding orders by user', { userId, ...options });
    try {
      // In production: queries PostgreSQL via Sequelize with pagination
      // const { rows, count } = await Order.findAndCountAll({
      //   where: { userId },
      //   limit: options?.limit || 20,
      //   offset: options?.offset || 0,
      //   order: [['createdAt', 'DESC']],
      //   include: [{ model: Product, as: 'products' }],
      // });
      return { orders: [], total: 0 };
    } catch (error) {
      logger.error('Error finding orders by user', error);
      throw error;
    }
  }

  /**
   * Find all orders with a specific status.
   */
  static async findByStatus(status: OrderStatus): Promise<Order[]> {
    logger.debug('Finding orders by status', { status });
    try {
      // return await Order.findAll({
      //   where: { status },
      //   order: [['createdAt', 'ASC']],
      // });
      return [];
    } catch (error) {
      logger.error('Error finding orders by status', error);
      throw error;
    }
  }

  /**
   * Create a new order from items.
   */
  static async createOrder(
    userId: string,
    items: IOrderItem[]
  ): Promise<Order> {
    logger.info('Creating new order', { userId, itemCount: items.length });
    try {
      const order = new Order();
      order.userId = userId;
      order.items = items;
      order.status = OrderStatus.PENDING;
      order.totalAmount = order.calculateTotal();
      order.createdAt = new Date();
      order.updatedAt = new Date();

      // await order.save();
      logger.info('Order created successfully', { orderId: order.id, total: order.totalAmount });
      return order;
    } catch (error) {
      logger.error('Error creating order', error);
      throw error;
    }
  }

  /**
   * Calculate the total amount for all items in the order.
   */
  calculateTotal(): number {
    if (!this.items || this.items.length === 0) {
      return 0;
    }
    return this.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
  }

  /**
   * Check if the order can be cancelled.
   * Only PENDING and CONFIRMED orders can be cancelled.
   */
  canCancel(): boolean {
    const cancellableStatuses: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
    ];
    return cancellableStatuses.includes(this.status);
  }

  /**
   * Check if the order can transition to the given status.
   */
  canTransitionTo(newStatus: OrderStatus): boolean {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: [],
    };

    return validTransitions[this.status]?.includes(newStatus) ?? false;
  }

  /**
   * Update the order status with validation.
   */
  async updateStatus(newStatus: OrderStatus): Promise<void> {
    if (!this.canTransitionTo(newStatus)) {
      throw new Error(
        `Invalid status transition: ${this.status} -> ${newStatus}`
      );
    }

    const previousStatus = this.status;
    this.status = newStatus;
    this.updatedAt = new Date();
    // await this.save();

    logger.info('Order status updated', {
      orderId: this.id,
      from: previousStatus,
      to: newStatus,
    });
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      userId: this.userId,
      items: this.items,
      status: this.status,
      totalAmount: this.totalAmount,
      paymentIntentId: this.paymentIntentId,
      shippingAddress: this.shippingAddress,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default Order;
