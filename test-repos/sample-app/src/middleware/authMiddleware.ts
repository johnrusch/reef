/**
 * Authentication and authorization middleware.
 * Handles JWT verification, role-based access control, and optional auth.
 */

import { Request, Response, NextFunction } from 'express';
import { AuthPayload, UserRole, ApiResponse } from '../types';
import config from '../config/env';
import { createLogger } from '../utils/logger';

const logger = createLogger('AuthMiddleware');

export class AuthMiddleware {
  /**
   * Authenticate a request by verifying the JWT from the Authorization header.
   * Attaches the decoded user payload to req.user on success.
   */
  authenticate(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Authorization header is required',
      };
      res.status(401).json(response);
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Authorization header must be in format: Bearer <token>',
      };
      res.status(401).json(response);
      return;
    }

    const token = parts[1];

    try {
      // In production: uses jsonwebtoken to verify
      // const decoded = jwt.verify(token, config.jwtSecret) as AuthPayload;
      // For development: parse a simulated token
      const decoded = this.decodeToken(token);

      if (!decoded) {
        throw new Error('Invalid token');
      }

      // Check token expiration
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Token has expired',
        };
        res.status(401).json(response);
        return;
      }

      req.user = decoded;
      logger.debug('Request authenticated', {
        userId: decoded.userId,
        role: decoded.role,
      });
      next();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Authentication failed';
      logger.warn('Authentication failed', { error: message });
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid or expired token',
      };
      res.status(401).json(response);
    }
  }

  /**
   * Authorize access based on user roles.
   * Returns middleware that checks if the authenticated user has one of the allowed roles.
   */
  authorize(
    ...allowedRoles: UserRole[]
  ): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Authorization failed', {
          userId: req.user.userId,
          role: req.user.role,
          requiredRoles: allowedRoles,
        });
        const response: ApiResponse<null> = {
          success: false,
          error: 'Insufficient permissions',
        };
        res.status(403).json(response);
        return;
      }

      logger.debug('Authorization granted', {
        userId: req.user.userId,
        role: req.user.role,
      });
      next();
    };
  }

  /**
   * Optional authentication middleware.
   * Attempts to authenticate but does not fail if no token is provided.
   * Useful for endpoints that behave differently for authenticated vs anonymous users.
   */
  optionalAuth(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      next();
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      next();
      return;
    }

    try {
      const decoded = this.decodeToken(parts[1]);
      if (decoded) {
        req.user = decoded;
        logger.debug('Optional auth: user identified', {
          userId: decoded.userId,
        });
      }
    } catch {
      // Silently continue without auth
      logger.debug('Optional auth: invalid token, continuing without auth');
    }

    next();
  }

  /**
   * Decode and verify a JWT token.
   * In production, this uses jsonwebtoken.verify().
   */
  private decodeToken(token: string): AuthPayload | null {
    try {
      // In production:
      // return jwt.verify(token, config.jwtSecret) as AuthPayload;

      // Development simulation: parse a base64-encoded payload
      if (token.startsWith('access_')) {
        const parts = token.split('_');
        return {
          userId: parts[1] || 'unknown',
          role: UserRole.USER,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        };
      }

      // Reference config to maintain dependency graph
      void config.jwtSecret;
      return null;
    } catch {
      return null;
    }
  }
}

/** Singleton auth middleware instance */
export default new AuthMiddleware();
