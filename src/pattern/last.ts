import { CronPattern } from './base';
import { ordinal, DAY_NAMES } from '../utils';

export class LastPattern extends CronPattern {
  offset = 0;
  dow?: number;

  constructor(fieldType: FieldType, offset = 0, dow?: number) {
    super(fieldType);
    this.offset = offset;
    this.dow = dow;
  }

  match(v: number, dt: DateTime): boolean {
    if (this.fieldType === 'dom') {
      return dt.day === dt.daysInMonth - this.offset;
    }
    if (this.fieldType === 'dow') {
      const target = this.dow ?? 7;
      const lastDay = dt.daysInMonth;
      const lastDt = dt.set({ day: lastDay });
      const daysBack = (lastDt.weekday - target + 7) % 7;
      return dt.day === lastDay - daysBack;
    }
    return false;
  }

  toEnglish(): string {
    if (this.fieldType === 'dom') {
      return this.offset === 0
        ? 'on the last day'
        : `on the ${ordinal(this.offset)} to last day`;
    }
    return `on the last ${DAY_NAMES[this.dow ?? 7]}`;
  }

  toString(): string {
    if (this.fieldType === 'dom') {
      return this.offset === 0 ? 'L' : `L-${this.offset}`;
    }
    return this.dow ? `${this.dow}L` : 'L';
  }
}
