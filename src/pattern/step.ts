import { CronPattern } from './base';
import { WildcardPattern } from './wildcard';
import { RangePattern } from './range';
import { SinglePattern } from './single';

export class StepPattern extends CronPattern {

  constructor(
    fieldType: FieldType,
    public readonly base: CronPattern,
    public readonly step: number
  ) {
    super(fieldType);
    this.addChild(base);
  }

  match(v: number, dt: DateTime): boolean {
    if (this.step <= 0) return false;

    if (this.base instanceof WildcardPattern) {
      return v % this.step === 0;
    }
    if (this.base instanceof SinglePattern) {
      return v >= this.base.value && (v - this.base.value) % this.step === 0;
    }
    if (this.base instanceof RangePattern) {
      const min = this.base.children[0].value as number;
      const max = this.base.children[1].value as number;
      return v >= min && v <= max && (v - min) % this.step === 0;
    }
    return false;
  }

  toEnglish(): string {
    let s = `every ${this.step} ${this.englishUnit()}`;
    if (this.step != 1) { s += 's' };
    if (this.base instanceof RangePattern) {
      const from = this.base.children[0].englishValue();
      const to = this.base.children[1].englishValue();
      s += ` from ${from} to ${to}`;
    } else if (this.base instanceof SinglePattern) {
      s += ' starting ';
      if (/^second|minute|hour$/.test(this.base.fieldType)) {
        s += 'at ';
      }
      else {
        s += 'on ';
      }
      s += this.base.englishValue();
    }
    return s;
  }

  toString(): string {
    return `${this.base}/${this.step}`;
  }
}
