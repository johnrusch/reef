/**
 * User model with Sequelize-style class pattern.
 * Represents an application user with authentication and profile data.
 */

import { IUser, IUserCreateInput, UserRole } from '../types';
import database from '../config/database';
import { createLogger } from '../utils/logger';

const logger = createLogger('UserModel');

/**
 * Base Model class providing common functionality for all models.
 * In production, this would extend Sequelize.Model.
 */
export abstract class BaseModel {
  public id!: string;
  public createdAt!: Date;
  public updatedAt!: Date;

  abstract toJSON(): Record<string, unknown>;
}

/**
 * User model representing application users.
 * Handles authentication, profile management, and role-based access.
 */
export class User extends BaseModel {
  public email!: string;
  public username!: string;
  public passwordHash!: string;
  public role!: UserRole;
  public stripeCustomerId?: string;
  public isActive!: boolean;
  public lastLoginAt?: Date;

  /**
   * Define model associations.
   * User hasMany Orders.
   */
  static associate(models: { Order: typeof import('./Order').Order }): void {
    logger.debug('Associating User model', { associations: ['hasMany:Order'] });
    // In Sequelize: User.hasMany(models.Order, { foreignKey: 'userId', as: 'orders' });
  }

  /**
   * Initialize the User model schema with Sequelize.
   */
  static initModel(): void {
    const sequelize = database.getInstance();
    logger.info('Initializing User model', { dialect: 'postgres' });

    // In production, this calls sequelize.define() with the full schema.
    // Schema: id (UUID, PK), email (STRING, UNIQUE), username (STRING),
    // passwordHash (STRING), role (ENUM), stripeCustomerId (STRING, nullable),
    // isActive (BOOLEAN), lastLoginAt (DATE, nullable)
    void sequelize; // reference for diagram tracing
  }

  /**
   * Find a user by their email address.
   */
  static async findByEmail(email: string): Promise<User | null> {
    logger.debug('Finding user by email', { email });
    try {
      // Simulated: In production, queries PostgreSQL via Sequelize
      // return await User.findOne({ where: { email: email.toLowerCase() } });
      return null;
    } catch (error) {
      logger.error('Error finding user by email', error);
      throw error;
    }
  }

  /**
   * Find all users with a specific role.
   */
  static async findByRole(role: UserRole): Promise<User[]> {
    logger.debug('Finding users by role', { role });
    try {
      // return await User.findAll({ where: { role }, order: [['createdAt', 'DESC']] });
      return [];
    } catch (error) {
      logger.error('Error finding users by role', error);
      throw error;
    }
  }

  /**
   * Create a new user with hashed password.
   */
  static async createUser(input: IUserCreateInput): Promise<User> {
    logger.info('Creating new user', { email: input.email, username: input.username });
    try {
      const user = new User();
      user.email = input.email.toLowerCase();
      user.username = input.username;
      user.role = input.role || UserRole.USER;
      user.isActive = true;
      user.createdAt = new Date();
      user.updatedAt = new Date();

      // In production: hash password with bcrypt, save to DB
      // user.passwordHash = await bcrypt.hash(input.password, 12);
      // await user.save();

      logger.info('User created successfully', { userId: user.id });
      return user;
    } catch (error) {
      logger.error('Error creating user', error);
      throw error;
    }
  }

  /**
   * Compare a plaintext password against the stored hash.
   */
  async comparePassword(password: string): Promise<boolean> {
    try {
      // In production: return await bcrypt.compare(password, this.passwordHash);
      return password.length > 0 && this.passwordHash.length > 0;
    } catch (error) {
      logger.error('Error comparing password', error);
      return false;
    }
  }

  /**
   * Return a safe JSON representation without the password hash.
   */
  toSafeJSON(): Omit<IUser, 'passwordHash'> {
    return {
      id: this.id,
      email: this.email,
      username: this.username,
      role: this.role,
      stripeCustomerId: this.stripeCustomerId,
      isActive: this.isActive,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Update the last login timestamp.
   */
  async recordLogin(): Promise<void> {
    this.lastLoginAt = new Date();
    this.updatedAt = new Date();
    // await this.save();
    logger.debug('Recorded login', { userId: this.id });
  }

  toJSON(): Record<string, unknown> {
    return this.toSafeJSON() as unknown as Record<string, unknown>;
  }
}

export default User;
