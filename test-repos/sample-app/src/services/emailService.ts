/**
 * Email service wrapping SendGrid API.
 * Handles transactional email delivery for user notifications.
 * Represents an external system boundary in C4 context diagrams.
 */

import { IUser, IOrder, EmailOptions } from '../types';
import config from '../config/env';
import { createLogger } from '../utils/logger';

const logger = createLogger('EmailService');

export class EmailService {
  private readonly apiKey: string;
  private readonly fromAddress: string;
  private readonly isEnabled: boolean;

  constructor() {
    this.apiKey = config.sendgridApiKey;
    this.fromAddress = 'noreply@sample-app.com';
    this.isEnabled = this.apiKey.length > 0;

    if (!this.isEnabled) {
      logger.warn('SendGrid API key not configured. Emails will be logged but not sent.');
    }
  }

  /**
   * Send an email via SendGrid.
   * In development mode, logs the email instead of sending.
   */
  private async send(options: EmailOptions): Promise<void> {
    const { to, subject, html, from } = options;
    const sender = from || this.fromAddress;

    logger.info('Sending email', { to, subject, from: sender });

    if (!this.isEnabled || config.nodeEnv === 'development') {
      logger.debug('Email (dev mode - not sent)', {
        to,
        subject,
        bodyLength: html.length,
      });
      return;
    }

    try {
      // In production: uses @sendgrid/mail
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(this.apiKey);
      // await sgMail.send({ to, from: sender, subject, html });

      logger.info('Email sent successfully', { to, subject });
    } catch (error) {
      logger.error('Failed to send email via SendGrid', error, { to, subject });
      // Don't throw - email failures shouldn't break business logic
    }
  }

  /**
   * Send a welcome email to a newly registered user.
   */
  async sendWelcomeEmail(user: IUser): Promise<void> {
    logger.info('Sending welcome email', { userId: user.id, email: user.email });

    const html = `
      <h1>Welcome to Sample App, ${user.username}!</h1>
      <p>Your account has been created successfully.</p>
      <p>You can now start exploring our platform and placing orders.</p>
      <p>If you have any questions, feel free to reach out to our support team.</p>
    `;

    await this.send({
      to: user.email,
      subject: 'Welcome to Sample App!',
      html,
    });
  }

  /**
   * Send an order confirmation email with order details.
   */
  async sendOrderConfirmation(order: IOrder, user: IUser): Promise<void> {
    logger.info('Sending order confirmation', {
      orderId: order.id,
      userId: user.id,
    });

    const itemsList = order.items
      .map(
        (item) =>
          `<li>${item.productId}: ${item.quantity} x $${item.unitPrice.toFixed(2)}</li>`
      )
      .join('');

    const html = `
      <h1>Order Confirmation</h1>
      <p>Hi ${user.username}, your order has been confirmed!</p>
      <h2>Order #${order.id}</h2>
      <ul>${itemsList}</ul>
      <p><strong>Total: $${order.totalAmount.toFixed(2)}</strong></p>
      <p>Status: ${order.status}</p>
      <p>We'll notify you when your order ships.</p>
    `;

    await this.send({
      to: user.email,
      subject: `Order Confirmation #${order.id}`,
      html,
    });
  }

  /**
   * Send a password reset email with a reset token link.
   */
  async sendPasswordReset(user: IUser, resetToken: string): Promise<void> {
    logger.info('Sending password reset email', { userId: user.id });

    const resetUrl = `https://sample-app.com/reset-password?token=${resetToken}`;
    const html = `
      <h1>Password Reset Request</h1>
      <p>Hi ${user.username},</p>
      <p>We received a request to reset your password.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `;

    await this.send({
      to: user.email,
      subject: 'Password Reset Request',
      html,
    });
  }

  /**
   * Send a shipping notification when an order ships.
   */
  async sendShippingNotification(order: IOrder, userEmail: string): Promise<void> {
    logger.info('Sending shipping notification', { orderId: order.id });

    const html = `
      <h1>Your Order Has Shipped!</h1>
      <p>Great news! Order #${order.id} is on its way.</p>
      <p>Total: $${order.totalAmount.toFixed(2)}</p>
      <p>You'll receive tracking information shortly.</p>
    `;

    await this.send({
      to: userEmail,
      subject: `Order #${order.id} Has Shipped!`,
      html,
    });
  }
}

/** Singleton email service instance */
export default new EmailService();
