import { CronPattern } from './base';

export class ListPattern extends CronPattern {
  match(v: number, dt: DateTime): boolean {
    return this.children.some(child => child.match(v, dt));
  }

  toEnglish(): string {
    return this.children.map(c => c.toEnglish()).join(', ');
  }

  toString(): string {
    return this.children.join(',');
  }
}
