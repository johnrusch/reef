import { TestInterface } from '../types/TestInterface';

/**
 * Sample service class for testing static analysis
 */
export class TestService {
  private data: string[];
  private count: number;

  constructor() {
    this.data = [];
    this.count = 0;
  }

  public addItem(item: string): void {
    this.data.push(item);
    this.count++;
  }

  public getItems(): string[] {
    return this.data;
  }

  public getCount(): number {
    return this.count;
  }
}

export abstract class AbstractService implements TestInterface {
  id: string;
  name: string;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  abstract execute(): void;
}
