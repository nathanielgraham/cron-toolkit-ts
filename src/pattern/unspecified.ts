import { CronPattern } from './base';

export class UnspecifiedPattern extends CronPattern {
  match(): boolean { return true; }

  toEnglish(): string { return ''; }

  toString(): string { return '?'; }
}
