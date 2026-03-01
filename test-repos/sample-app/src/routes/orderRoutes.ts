/**
 * Order route definitions.
 * Wires HTTP routes to controller methods with authentication middleware.
 */

import { Router } from 'express';
import orderController from '../controllers/orderController';
import authMiddleware from '../middleware/authMiddleware';

const router = Router();

/**
 * POST /api/orders
 * Create a new order.
 * Requires authentication.
 */
router.post(
  '/',
  (req, res, next) => authMiddleware.authenticate(req, res, next),
  (req, res) => orderController.createOrder(req, res)
);

/**
 * GET /api/orders
 * Get order history for the authenticated user.
 * Requires authentication.
 */
router.get(
  '/',
  (req, res, next) => authMiddleware.authenticate(req, res, next),
  (req, res) => orderController.getOrderHistory(req, res)
);

/**
 * GET /api/orders/:id
 * Get a specific order by ID.
 * Requires authentication and ownership.
 */
router.get(
  '/:id',
  (req, res, next) => authMiddleware.authenticate(req, res, next),
  (req, res) => orderController.getOrder(req, res)
);

/**
 * POST /api/orders/:id/pay
 * Process payment for an order.
 * Requires authentication.
 */
router.post(
  '/:id/pay',
  (req, res, next) => authMiddleware.authenticate(req, res, next),
  (req, res) => orderController.processPayment(req, res)
);

/**
 * DELETE /api/orders/:id
 * Cancel an order.
 * Requires authentication and ownership.
 */
router.delete(
  '/:id',
  (req, res, next) => authMiddleware.authenticate(req, res, next),
  (req, res) => orderController.cancelOrder(req, res)
);

export default router;
