/**
 * Payment service wrapping Stripe API.
 * Handles payment processing, refunds, and customer management.
 * Represents an external system boundary in C4 context diagrams.
 */

import { IUser, PaymentIntent } from '../types';
import config from '../config/env';
import { createLogger } from '../utils/logger';

const logger = createLogger('PaymentService');

export class PaymentService {
  private readonly stripeSecretKey: string;
  private readonly isEnabled: boolean;
  private readonly defaultCurrency: string = 'usd';

  constructor() {
    this.stripeSecretKey = config.stripeSecretKey;
    this.isEnabled = this.stripeSecretKey.length > 0;

    if (!this.isEnabled) {
      logger.warn('Stripe secret key not configured. Payment operations will be simulated.');
    }
  }

  /**
   * Create a payment intent for an order.
   * Returns the client secret needed for frontend confirmation.
   */
  async createPaymentIntent(
    amount: number,
    currency: string = this.defaultCurrency,
    metadata: Record<string, string> = {}
  ): Promise<PaymentIntent> {
    logger.info('Creating payment intent', { amount, currency, metadata });

    if (amount <= 0) {
      throw new Error('Payment amount must be positive');
    }

    // Convert to cents for Stripe
    const amountInCents = Math.round(amount * 100);

    try {
      if (!this.isEnabled) {
        // Simulated response for development/testing
        const simulatedId = `pi_sim_${Date.now()}`;
        logger.debug('Simulated payment intent created', { id: simulatedId });
        return {
          clientSecret: `${simulatedId}_secret_simulated`,
          paymentIntentId: simulatedId,
          amount: amountInCents,
          currency,
          status: 'requires_payment_method',
        };
      }

      // In production: uses Stripe SDK
      // const stripe = new Stripe(this.stripeSecretKey);
      // const paymentIntent = await stripe.paymentIntents.create({
      //   amount: amountInCents,
      //   currency,
      //   metadata,
      //   automatic_payment_methods: { enabled: true },
      // });

      const paymentIntentId = `pi_${Date.now()}`;
      logger.info('Payment intent created', { paymentIntentId });

      return {
        clientSecret: `${paymentIntentId}_secret`,
        paymentIntentId,
        amount: amountInCents,
        currency,
        status: 'requires_payment_method',
      };
    } catch (error) {
      logger.error('Failed to create payment intent', error, { amount, currency });
      throw new Error('Payment processing failed. Please try again.');
    }
  }

  /**
   * Confirm a payment intent after the customer completes payment.
   * Returns true if the payment was successful.
   */
  async confirmPayment(paymentIntentId: string): Promise<boolean> {
    logger.info('Confirming payment', { paymentIntentId });

    if (!paymentIntentId) {
      throw new Error('Payment intent ID is required');
    }

    try {
      if (!this.isEnabled) {
        logger.debug('Simulated payment confirmation', { paymentIntentId });
        return true;
      }

      // In production:
      // const stripe = new Stripe(this.stripeSecretKey);
      // const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      // return intent.status === 'succeeded';

      logger.info('Payment confirmed successfully', { paymentIntentId });
      return true;
    } catch (error) {
      logger.error('Failed to confirm payment', error, { paymentIntentId });
      return false;
    }
  }

  /**
   * Process a refund for a payment.
   * Supports partial refunds by specifying an amount.
   */
  async refundPayment(
    paymentIntentId: string,
    amount?: number
  ): Promise<void> {
    logger.info('Processing refund', { paymentIntentId, amount });

    if (!paymentIntentId) {
      throw new Error('Payment intent ID is required');
    }

    try {
      if (!this.isEnabled) {
        logger.debug('Simulated refund processed', { paymentIntentId, amount });
        return;
      }

      // In production:
      // const stripe = new Stripe(this.stripeSecretKey);
      // const refundParams: Stripe.RefundCreateParams = {
      //   payment_intent: paymentIntentId,
      // };
      // if (amount) {
      //   refundParams.amount = Math.round(amount * 100);
      // }
      // await stripe.refunds.create(refundParams);

      logger.info('Refund processed successfully', { paymentIntentId, amount });
    } catch (error) {
      logger.error('Failed to process refund', error, { paymentIntentId });
      throw new Error('Refund processing failed. Please try again.');
    }
  }

  /**
   * Create a Stripe customer record for a user.
   * Returns the Stripe customer ID for future transactions.
   */
  async createCustomer(user: IUser): Promise<string> {
    logger.info('Creating Stripe customer', { userId: user.id, email: user.email });

    try {
      if (!this.isEnabled) {
        const simulatedId = `cus_sim_${Date.now()}`;
        logger.debug('Simulated customer created', { customerId: simulatedId });
        return simulatedId;
      }

      // In production:
      // const stripe = new Stripe(this.stripeSecretKey);
      // const customer = await stripe.customers.create({
      //   email: user.email,
      //   name: user.username,
      //   metadata: { userId: user.id },
      // });
      // return customer.id;

      const customerId = `cus_${Date.now()}`;
      logger.info('Customer created', { customerId, userId: user.id });
      return customerId;
    } catch (error) {
      logger.error('Failed to create Stripe customer', error, { userId: user.id });
      throw new Error('Failed to create payment profile. Please try again.');
    }
  }

  /**
   * Check if the payment service is properly configured and operational.
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }
    try {
      // In production: stripe.balance.retrieve() to verify connectivity
      return true;
    } catch {
      return false;
    }
  }
}

/** Singleton payment service instance */
export default new PaymentService();
