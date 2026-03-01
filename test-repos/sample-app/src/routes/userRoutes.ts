/**
 * User route definitions.
 * Wires HTTP routes to controller methods with middleware.
 */

import { Router } from 'express';
import userController from '../controllers/userController';
import authMiddleware from '../middleware/authMiddleware';
import rateLimiter from '../middleware/rateLimiter';
import { UserRole } from '../types';

const router = Router();

/**
 * POST /api/users/register
 * Register a new user account.
 * Rate limited to prevent abuse.
 */
router.post(
  '/register',
  rateLimiter.strictLimit(15 * 60 * 1000, 5),
  (req, res) => userController.register(req, res)
);

/**
 * POST /api/users/login
 * Authenticate and receive JWT tokens.
 * Rate limited to prevent brute force attacks.
 */
router.post(
  '/login',
  rateLimiter.strictLimit(15 * 60 * 1000, 10),
  (req, res) => userController.login(req, res)
);

/**
 * GET /api/users/profile
 * Get the authenticated user's profile.
 * Requires valid JWT token.
 */
router.get(
  '/profile',
  (req, res, next) => authMiddleware.authenticate(req, res, next),
  (req, res) => userController.getProfile(req, res)
);

/**
 * PUT /api/users/profile
 * Update the authenticated user's profile.
 * Requires valid JWT token.
 */
router.put(
  '/profile',
  (req, res, next) => authMiddleware.authenticate(req, res, next),
  (req, res) => userController.updateProfile(req, res)
);

/**
 * GET /api/users
 * List all users with pagination.
 * Requires admin role.
 */
router.get(
  '/',
  (req, res, next) => authMiddleware.authenticate(req, res, next),
  authMiddleware.authorize(UserRole.ADMIN),
  (req, res) => userController.listUsers(req, res)
);

export default router;
