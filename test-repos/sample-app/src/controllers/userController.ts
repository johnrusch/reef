/**
 * User controller handling HTTP request/response for user-related endpoints.
 * Validates input, delegates to UserService, and formats API responses.
 */

import { Request, Response } from 'express';
import userService from '../services/userService';
import { ApiResponse, IUser, IUserCreateInput, UserRole } from '../types';
import { validateEmail, validatePagination, sanitizeString } from '../utils/validators';
import { createLogger } from '../utils/logger';

const logger = createLogger('UserController');

export class UserController {
  /**
   * Register a new user account.
   * POST /api/users/register
   */
  async register(req: Request, res: Response): Promise<void> {
    logger.info('Register request received', { email: req.body.email });

    try {
      const { email, username, password } = req.body;

      if (!email || !username || !password) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Email, username, and password are required',
        };
        res.status(400).json(response);
        return;
      }

      const input: IUserCreateInput = {
        email: sanitizeString(email),
        username: sanitizeString(username, 50),
        password,
      };

      const result = await userService.register(input);

      const response: ApiResponse<{ user: IUser; tokens: typeof result.tokens }> = {
        success: true,
        data: result,
      };

      res.status(201).json(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      logger.error('Registration failed', error as Error);
      const response: ApiResponse<null> = { success: false, error: message };
      res.status(400).json(response);
    }
  }

  /**
   * Authenticate a user and return tokens.
   * POST /api/users/login
   */
  async login(req: Request, res: Response): Promise<void> {
    logger.info('Login request received');

    try {
      const { email, password } = req.body;

      if (!email || !password) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Email and password are required',
        };
        res.status(400).json(response);
        return;
      }

      const result = await userService.authenticate(email, password);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      logger.error('Login failed', error as Error);
      const response: ApiResponse<null> = { success: false, error: message };
      res.status(401).json(response);
    }
  }

  /**
   * Get the authenticated user's profile.
   * GET /api/users/profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    logger.debug('Get profile request', { userId: req.user?.userId });

    try {
      if (!req.user?.userId) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const user = await userService.getProfile(req.user.userId);

      const response: ApiResponse<IUser> = { success: true, data: user };
      res.status(200).json(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get profile';
      logger.error('Get profile failed', error as Error);
      const response: ApiResponse<null> = { success: false, error: message };
      res.status(404).json(response);
    }
  }

  /**
   * Update the authenticated user's profile.
   * PUT /api/users/profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    logger.info('Update profile request', { userId: req.user?.userId });

    try {
      if (!req.user?.userId) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const updateData: Record<string, unknown> = {};

      if (req.body.username) {
        updateData.username = sanitizeString(req.body.username, 50);
      }
      if (req.body.email) {
        if (!validateEmail(req.body.email)) {
          const response: ApiResponse<null> = {
            success: false,
            error: 'Invalid email format',
          };
          res.status(400).json(response);
          return;
        }
        updateData.email = req.body.email;
      }

      const user = await userService.updateProfile(req.user.userId, updateData);

      const response: ApiResponse<IUser> = { success: true, data: user };
      res.status(200).json(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      logger.error('Update profile failed', error as Error);
      const response: ApiResponse<null> = { success: false, error: message };
      res.status(400).json(response);
    }
  }

  /**
   * List all users with pagination (admin only).
   * GET /api/users
   */
  async listUsers(req: Request, res: Response): Promise<void> {
    logger.info('List users request', { userId: req.user?.userId });

    try {
      const pagination = validatePagination({
        page: parseInt(req.query.page as string, 10),
        limit: parseInt(req.query.limit as string, 10),
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      });

      const result = await userService.listUsers(pagination);
      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list users';
      logger.error('List users failed', error as Error);
      const response: ApiResponse<null> = { success: false, error: message };
      res.status(500).json(response);
    }
  }
}

/** Singleton user controller instance */
export default new UserController();
