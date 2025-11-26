import { CronPattern } from './base';

export class WildcardPattern extends CronPattern {
  match(): boolean { return true; }

  toEnglish(): string {
    return `every ${this.englishUnit()}`;
  }

  toString(): string { return '*'; }
}
