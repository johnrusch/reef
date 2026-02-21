/**
 * Entry point for testing entry point detection
 */
import { TestService } from './services/TestService';

const service = new TestService();
service.addItem('test');

console.log('Service initialized');
