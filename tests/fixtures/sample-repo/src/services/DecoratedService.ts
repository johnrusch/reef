/**
 * A service with decorators for testing decorator extraction
 */
export function Injectable(): ClassDecorator {
  return (target: any) => target;
}

/**
 * A decorated service class for testing decorator and JSDoc extraction
 */
@Injectable()
export class DecoratedService {
  /** Handles data processing */
  async processData(input: string): Promise<string> {
    return input.toUpperCase();
  }

  getStatus(): string {
    return 'active';
  }
}
