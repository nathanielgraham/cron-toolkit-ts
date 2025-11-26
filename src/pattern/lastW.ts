import { CronPattern } from './base';

export class LastWPattern extends CronPattern {
  match(v: number, dt: DateTime): boolean {
    let candidate = dt.daysInMonth;
    while (candidate >= 1) {
      const test = dt.set({ day: candidate });
      if (test.weekday >= 1 && test.weekday <= 5) {
        return dt.day === candidate;
      }
      candidate--;
    }
    return false;
  }

  toEnglish(): string {
    return 'on the last weekday';
  }

  toString(): string {
    return 'LW';
  }
}
