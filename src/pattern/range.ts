import { CronPattern } from './base';
import { SinglePattern } from './single';

export class RangePattern extends CronPattern {
  wrapped = false;

  constructor(fieldType: FieldType, start: number, end: number, wrapped = false) {
    super(fieldType);
    this.addChild(new SinglePattern(fieldType, start));
    this.addChild(new SinglePattern(fieldType, end));
    this.wrapped = wrapped;
  }

  match(v: number, dt: DateTime): boolean {
    const min = this.children[0].value as number;
    const max = this.children[1].value as number;
    if (this.fieldType === 'dow' && this.wrapped) {
      return v >= min || v <= max;
    }
    return v >= min && v <= max;
  }

  toEnglish(): string {
    const from = this.children[0].toEnglish();
    const to = this.children[1].toEnglish();
    return `every ${this.englishUnit()} from ${from} to ${to}`;
  }

  toString(): string {
    return `${this.children[0]}-${this.children[1]}`;
  }
}
