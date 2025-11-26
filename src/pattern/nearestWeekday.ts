import { CronPattern } from './base';
import { ordinal } from '../utils';

export class NearestWeekdayPattern extends CronPattern {
  constructor(fieldType: FieldType, public readonly dom: number) {
    super(fieldType);
  }

  match(v: number, dt: DateTime): boolean {
    if (this.dom < 1 || this.dom > dt.daysInMonth) return false;
    const target = dt.set({ day: this.dom });
    const wd = target.weekday;
    if (wd >= 2 && wd <= 5) return dt.day === this.dom;

    const before = target.minus({ days: 1 });
    const after = target.plus({ days: 1 });

    return (
      (before.weekday >= 1 && before.weekday <= 5 && dt.day === this.dom - 1) ||
      (after.weekday >= 1 && after.weekday <= 5 && dt.day === this.dom + 1 && this.dom + 1 <= dt.daysInMonth)
    );
  }

  toEnglish(): string {
    return `on the nearest weekday to the ${ordinal(this.dom)}`;
  }

  toString(): string {
    return `${this.dom}W`;
  }
}
