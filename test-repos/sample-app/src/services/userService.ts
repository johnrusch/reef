/**
 * User service handling business logic for user management.
 * Coordinates between User model, EmailService, and auth utilities.
 */

import { IUser, IUserCreateInput, IUserUpdateInput, UserRole, ApiResponse, PaginationOptions, AuthTokens } from '../types';
import User from '../models/User';
import emailService from './emailService';
import { createLogger } from '../utils/logger';
import { validateEmail, validatePassword, validatePagination } from '../utils/validators';

const logger = createLogger('UserService');

export class UserService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;

  constructor() {
    // In production: read from config
    this.jwtSecret = process.env.JWT_SECRET || 'dev-secret';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1h';
  }

  /**
   * Register a new user account.
   * Validates input, creates user, and sends welcome email.
   */
  async register(input: IUserCreateInput): Promise<{ user: IUser; tokens: AuthTokens }> {
    logger.info('Registering new user', { email: input.email, username: input.username });

    // Validate email format
    if (!validateEmail(input.email)) {
      throw new Error('Invalid email address format');
    }

    // Validate password strength
    const passwordValidation = validatePassword(input.password);
    if (!passwordValidation.valid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Check for existing user
    const existingUser = await User.findByEmail(input.email);
    if (existingUser) {
      throw new Error('An account with this email already exists');
    }

    try {
      // Create the user
      const user = await User.createUser(input);

      // Generate auth tokens
      const tokens = this.generateTokens(user);

      // Send welcome email (async, non-blocking)
      emailService.sendWelcomeEmail(user as unknown as IUser).catch((err) => {
        logger.error('Failed to send welcome email', err, { userId: user.id });
      });

      logger.info('User registered successfully', { userId: user.id });
      return { user: user as unknown as IUser, tokens };
    } catch (error) {
      logger.error('User registration failed', error, { email: input.email });
      throw error;
    }
  }

  /**
   * Authenticate a user with email and password.
   * Returns user data and JWT tokens on success.
   */
  async authenticate(
    email: string,
    password: string
  ): Promise<{ user: IUser; tokens: AuthTokens }> {
    logger.info('Authenticating user', { email });

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const user = await User.findByEmail(email.toLowerCase());
    if (!user) {
      // Use generic message to prevent email enumeration
      throw new Error('Invalid email or password');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated. Please contact support.');
    }

    // Record login timestamp
    await user.recordLogin();

    // Generate tokens
    const tokens = this.generateTokens(user as unknown as IUser);

    logger.info('User authenticated successfully', { userId: user.id });
    return { user: user.toSafeJSON() as unknown as IUser, tokens };
  }

  /**
   * Get a user's profile by ID.
   */
  async getProfile(userId: string): Promise<IUser> {
    logger.debug('Getting user profile', { userId });

    // In production: User.findByPk(userId)
    const user = await User.findByEmail(''); // placeholder
    if (!user) {
      throw new Error('User not found');
    }

    return user.toSafeJSON() as unknown as IUser;
  }

  /**
   * Update a user's profile information.
   */
  async updateProfile(userId: string, data: IUserUpdateInput): Promise<IUser> {
    logger.info('Updating user profile', { userId, fields: Object.keys(data) });

    if (data.email && !validateEmail(data.email)) {
      throw new Error('Invalid email address format');
    }

    try {
      // In production: find user, update fields, save
      // const user = await User.findByPk(userId);
      // if (!user) throw new Error('User not found');
      // Object.assign(user, data);
      // await user.save();

      logger.info('User profile updated', { userId });
      return {} as IUser; // placeholder
    } catch (error) {
      logger.error('Failed to update user profile', error, { userId });
      throw error;
    }
  }

  /**
   * List users with pagination (admin only).
   */
  async listUsers(options: Partial<PaginationOptions>): Promise<ApiResponse<IUser[]>> {
    const pagination = validatePagination(options);
    logger.debug('Listing users', pagination);

    try {
      // In production: paginated query
      // const { rows, count } = await User.findAndCountAll({
      //   limit: pagination.limit,
      //   offset: (pagination.page - 1) * pagination.limit,
      //   order: [[pagination.sortBy!, pagination.sortOrder!]],
      //   attributes: { exclude: ['passwordHash'] },
      // });

      const total = 0;
      return {
        success: true,
        data: [],
        meta: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit),
        },
      };
    } catch (error) {
      logger.error('Failed to list users', error);
      throw error;
    }
  }

  /**
   * Change a user's role (admin only).
   */
  async changeRole(userId: string, newRole: UserRole): Promise<IUser> {
    logger.info('Changing user role', { userId, newRole });

    if (!Object.values(UserRole).includes(newRole)) {
      throw new Error('Invalid role specified');
    }

    try {
      // In production: find and update
      return {} as IUser; // placeholder
    } catch (error) {
      logger.error('Failed to change user role', error, { userId, newRole });
      throw error;
    }
  }

  /**
   * Generate JWT access and refresh tokens for a user.
   */
  private generateTokens(user: IUser): AuthTokens {
    // In production: uses jsonwebtoken
    // const accessToken = jwt.sign(
    //   { userId: user.id, role: user.role },
    //   this.jwtSecret,
    //   { expiresIn: this.jwtExpiresIn }
    // );
    // const refreshToken = jwt.sign(
    //   { userId: user.id, type: 'refresh' },
    //   config.jwtRefreshSecret,
    //   { expiresIn: config.jwtRefreshExpiresIn }
    // );

    return {
      accessToken: `access_${user.id}_${Date.now()}`,
      refreshToken: `refresh_${user.id}_${Date.now()}`,
      expiresIn: 3600,
    };
  }
}

/** Singleton user service instance */
export default new UserService();
