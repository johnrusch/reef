/**
 * Order controller handling HTTP request/response for order-related endpoints.
 * Validates input, delegates to OrderService, and formats API responses.
 */

import { Request, Response } from 'express';
import orderService from '../services/orderService';
import { ApiResponse, IOrder, IOrderItem } from '../types';
import { validatePagination, validateUUID } from '../utils/validators';
import { createLogger } from '../utils/logger';

const logger = createLogger('OrderController');

export class OrderController {
  /**
   * Create a new order.
   * POST /api/orders
   */
  async createOrder(req: Request, res: Response): Promise<void> {
    logger.info('Create order request', { userId: req.user?.userId });

    try {
      if (!req.user?.userId) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const { items } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Order must contain at least one item',
        };
        res.status(400).json(response);
        return;
      }

      // Validate each item
      for (const item of items as IOrderItem[]) {
        if (!item.productId || !item.quantity || item.quantity <= 0) {
          const response: ApiResponse<null> = {
            success: false,
            error: 'Each item must have a valid productId and positive quantity',
          };
          res.status(400).json(response);
          return;
        }
      }

      const result = await orderService.createOrder(req.user.userId, items);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
      };

      res.status(201).json(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create order';
      logger.error('Create order failed', error as Error);
      const response: ApiResponse<null> = { success: false, error: message };
      res.status(400).json(response);
    }
  }

  /**
   * Get a specific order by ID.
   * GET /api/orders/:id
   */
  async getOrder(req: Request, res: Response): Promise<void> {
    logger.debug('Get order request', { orderId: req.params.id });

    try {
      if (!req.user?.userId) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const orderId = req.params.id;
      if (!validateUUID(orderId)) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Invalid order ID format',
        };
        res.status(400).json(response);
        return;
      }

      const order = await orderService.getOrder(orderId, req.user.userId);

      const response: ApiResponse<IOrder> = { success: true, data: order };
      res.status(200).json(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get order';
      logger.error('Get order failed', error as Error);
      const statusCode = message === 'Order not found' ? 404 : message === 'Access denied' ? 403 : 500;
      const response: ApiResponse<null> = { success: false, error: message };
      res.status(statusCode).json(response);
    }
  }

  /**
   * Get order history for the authenticated user.
   * GET /api/orders
   */
  async getOrderHistory(req: Request, res: Response): Promise<void> {
    logger.debug('Get order history request', { userId: req.user?.userId });

    try {
      if (!req.user?.userId) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const pagination = validatePagination({
        page: parseInt(req.query.page as string, 10),
        limit: parseInt(req.query.limit as string, 10),
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      });

      const result = await orderService.getOrderHistory(
        req.user.userId,
        pagination
      );

      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get order history';
      logger.error('Get order history failed', error as Error);
      const response: ApiResponse<null> = { success: false, error: message };
      res.status(500).json(response);
    }
  }

  /**
   * Cancel an order.
   * DELETE /api/orders/:id
   */
  async cancelOrder(req: Request, res: Response): Promise<void> {
    logger.info('Cancel order request', {
      orderId: req.params.id,
      userId: req.user?.userId,
    });

    try {
      if (!req.user?.userId) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const orderId = req.params.id;
      if (!validateUUID(orderId)) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Invalid order ID format',
        };
        res.status(400).json(response);
        return;
      }

      await orderService.cancelOrder(orderId, req.user.userId);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'Order cancelled successfully' },
      };
      res.status(200).json(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel order';
      logger.error('Cancel order failed', error as Error);
      const statusCode =
        message === 'Order not found'
          ? 404
          : message.includes('can only cancel')
          ? 403
          : 400;
      const response: ApiResponse<null> = { success: false, error: message };
      res.status(statusCode).json(response);
    }
  }

  /**
   * Process payment for an order.
   * POST /api/orders/:id/pay
   */
  async processPayment(req: Request, res: Response): Promise<void> {
    logger.info('Process payment request', { orderId: req.params.id });

    try {
      if (!req.user?.userId) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const orderId = req.params.id;
      if (!validateUUID(orderId)) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Invalid order ID format',
        };
        res.status(400).json(response);
        return;
      }

      await orderService.processPayment(orderId);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'Payment processed successfully' },
      };
      res.status(200).json(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment processing failed';
      logger.error('Process payment failed', error as Error);
      const response: ApiResponse<null> = { success: false, error: message };
      res.status(400).json(response);
    }
  }
}

/** Singleton order controller instance */
export default new OrderController();
