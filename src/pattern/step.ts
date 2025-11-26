import { CronPattern } from './base';
import { WildcardPattern } from './wildcard';
import { RangePattern } from './range';

export class StepPattern extends CronPattern {
  constructor(
    fieldType: FieldType,
    public readonly base: CronPattern,
    public readonly step: number
  ) {
    super(fieldType);
    this.addChild(base);
    this.addChild({ value: step, toString: () => step.toString() } as any);
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
    if (this.base instanceof RangePattern) {
      s += ` ${this.base.toEnglish()}`;
    } else if (!(this.base instanceof WildcardPattern)) {
      s += ` starting ${this.base.toEnglish()}`;
    }
    return s;
  }

  toString(): string {
    return `${this.base}/${this.step}`;
  }
}
