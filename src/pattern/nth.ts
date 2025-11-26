import { CronPattern } from './base';
import { ordinal, DAY_NAMES } from '../utils';

export class NthPattern extends CronPattern {
  constructor(
    fieldType: FieldType,
    public readonly dow: number,
    public readonly nth: number
  ) {
    super(fieldType);
  }

  match(v: number, dt: DateTime): boolean {
    if (dt.weekday !== this.dow) return false;
    let count = 0;
    for (let d = 1; d < dt.day; d++) {
      if (dt.set({ day: d }).weekday === this.dow) count++;
    }
    return count + 1 === this.nth;
  }

  toEnglish(): string {
    return `on the ${ordinal(this.nth)} ${DAY_NAMES[this.dow]}`;
  }

  toString(): string {
    return `${this.dow}#${this.nth}`;
  }
}
