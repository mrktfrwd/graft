import { addNumbers, multiplyNumbers } from './math';

export class Calculator {
  public value: number;

  // Deliberately unannotated, so extractInterface has something real to report as
  // untyped rather than quietly emitting `any`.
  public label;

  constructor(initialValue: number = 0) {
    this.value = initialValue;
  }

  public add(amount: number): void {
    this.value = addNumbers(this.value, amount);
  }

  public multiply(amount: number): void {
    this.value = multiplyNumbers(this.value, amount);
  }

  // No return annotation — also reported, not silently typed.
  public describe() {
    return `${this.label}: ${this.value}`;
  }

  private secret(): void {
    this.value = 0;
  }

  public riskyOperation(): void {
    if (this.value < 0) {
      throw new Error("Value cannot be negative during risky operation!");
    }
    this.value *= 2;
  }
}
