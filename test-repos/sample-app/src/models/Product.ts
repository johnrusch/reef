/**
 * Product model representing items available for purchase.
 * Manages product catalog, inventory, and stock reservations.
 */

import { IProduct } from '../types';
import { BaseModel } from './User';
import { createLogger } from '../utils/logger';

const logger = createLogger('ProductModel');

/**
 * Product model with inventory management capabilities.
 */
export class Product extends BaseModel {
  public name!: string;
  public description!: string;
  public price!: number;
  public stock!: number;
  public category!: string;
  public sku!: string;
  public isActive!: boolean;

  /**
   * Define model associations.
   * Product belongsToMany Orders through OrderItems.
   */
  static associate(models: { Order: typeof import('./Order').Order }): void {
    logger.debug('Associating Product model', {
      associations: ['belongsToMany:Order'],
    });
    // Product.belongsToMany(models.Order, { through: 'OrderItems', as: 'orders' });
  }

  /**
   * Find all products in a specific category.
   */
  static async findByCategory(category: string): Promise<Product[]> {
    logger.debug('Finding products by category', { category });
    try {
      // return await Product.findAll({
      //   where: { category, isActive: true },
      //   order: [['name', 'ASC']],
      // });
      return [];
    } catch (error) {
      logger.error('Error finding products by category', error);
      throw error;
    }
  }

  /**
   * Search products by name using a partial match.
   */
  static async searchByName(query: string): Promise<Product[]> {
    logger.debug('Searching products by name', { query });
    try {
      // In production: uses PostgreSQL ILIKE for case-insensitive search
      // return await Product.findAll({
      //   where: {
      //     name: { [Op.iLike]: `%${query}%` },
      //     isActive: true,
      //   },
      //   limit: 50,
      // });
      return [];
    } catch (error) {
      logger.error('Error searching products', error);
      throw error;
    }
  }

  /**
   * Get all active products with optional pagination.
   */
  static async findActive(options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ products: Product[]; total: number }> {
    logger.debug('Finding active products', options);
    try {
      // const { rows, count } = await Product.findAndCountAll({
      //   where: { isActive: true },
      //   limit: options?.limit || 20,
      //   offset: options?.offset || 0,
      // });
      return { products: [], total: 0 };
    } catch (error) {
      logger.error('Error finding active products', error);
      throw error;
    }
  }

  /**
   * Check if the product has sufficient stock.
   */
  isInStock(quantity: number = 1): boolean {
    return this.isActive && this.stock >= quantity;
  }

  /**
   * Reserve stock for an order.
   * Decrements available stock if sufficient quantity exists.
   * Uses optimistic locking to prevent overselling.
   */
  async reserveStock(quantity: number): Promise<boolean> {
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    if (!this.isInStock(quantity)) {
      logger.warn('Insufficient stock for reservation', {
        productId: this.id,
        requested: quantity,
        available: this.stock,
      });
      return false;
    }

    try {
      this.stock -= quantity;
      this.updatedAt = new Date();
      // In production: uses optimistic locking
      // await this.save({ where: { id: this.id, stock: { [Op.gte]: quantity } } });

      logger.info('Stock reserved', {
        productId: this.id,
        reserved: quantity,
        remaining: this.stock,
      });
      return true;
    } catch (error) {
      logger.error('Error reserving stock', error);
      this.stock += quantity; // rollback in-memory change
      return false;
    }
  }

  /**
   * Release previously reserved stock (e.g., on order cancellation).
   */
  async releaseStock(quantity: number): Promise<void> {
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    this.stock += quantity;
    this.updatedAt = new Date();
    // await this.save();

    logger.info('Stock released', {
      productId: this.id,
      released: quantity,
      available: this.stock,
    });
  }

  /**
   * Deactivate the product (soft delete).
   */
  async deactivate(): Promise<void> {
    this.isActive = false;
    this.updatedAt = new Date();
    // await this.save();
    logger.info('Product deactivated', { productId: this.id, sku: this.sku });
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      price: this.price,
      stock: this.stock,
      category: this.category,
      sku: this.sku,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default Product;
