import { add, multiplyNumbers } from './math';

export interface ICalculator {
    value: number;
    add(amount: number): void;
    multiply(amount: number): void;
    riskyOperation(): void;
}

export class Calculator implements ICalculator {
  public value: number;

  constructor(initialValue: number = 0) {
    this.value = initialValue;
  }

  public add(amount: number): void {
    this.value = add(this.value, amount);
  }

  public multiply(amount: number): void {
    this.value = multiplyNumbers(this.value, amount);
  }

  public riskyOperation(): void {
      try {
        // A function that we might want to wrap in a try/catch
        if (this.value < 0) {
          throw new Error("Value cannot be negative during risky operation!");
        }
        this.value *= 2;
      } catch (error) {
        console.error("Error in riskyOperation:", error);
        throw error;
      }
  }
}
