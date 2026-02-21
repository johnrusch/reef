/**
 * Sample interface for testing static analysis
 */
export interface TestInterface {
  id: string;
  name: string;
  optional?: number;
}

export interface ExtendedInterface extends TestInterface {
  extra: boolean;
}
