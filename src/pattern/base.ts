// src/pattern/base.ts
import { DateTime } from 'luxon';
import { LIMITS, ordinal, MONTH_NAMES, DAY_NAMES } from '../utils'; 
// import { SinglePattern } from './single';

export type FieldType = 'second' | 'minute' | 'hour' | 'dom' | 'month' | 'dow' | 'year';


export abstract class CronPattern {
  children: CronPattern[] = [];
  value?: number | string;

  constructor(
    public readonly fieldType: FieldType,
    value?: number | string
  ) {
    this.value = value;
  }

  addChild(child: CronPattern) {
    this.children.push(child);
  }

  // THE ONE TRUE english_value() — exactly like Perl
  englishValue(): string {
    if (this.value === undefined) {
      throw new Error('missing value');
    }

    if (this.fieldType === 'dom') {
      return `the ${ordinal(this.value as number)}`;
    }
    if (this.fieldType === 'month') {
      return MONTH_NAMES[this.value as number];
    }
    if (this.fieldType === 'dow') {
      return DAY_NAMES[this.value as number];
    }
    return this.value.toString();
  }

  englishUnit(): string {
    let unit = this.fieldType === 'dom' || this.fieldType === 'dow' ? 'day' : this.fieldType;
    if (
      'value' in this &&
      typeof (this as any).value === 'number' &&
      (this as any).value !== 1 &&
      this.fieldType !== 'year'
    ) {
      unit += 's';
    }
    return unit;
  }

  lowest(dt: DateTime): number | undefined {
    const [min, max] = LIMITS[this.fieldType];
    const actualMax = this.fieldType === 'dom' ? dt.daysInMonth : max;
    for (let v = min; v <= actualMax; v++) {
      if (this.match(v, dt)) return v;
    }
    return undefined;
  }

  highest(dt: DateTime): number | undefined {
    const [min, max] = LIMITS[this.fieldType];
    const actualMax = this.fieldType === 'dom' ? dt.daysInMonth : max;
    for (let v = actualMax; v >= min; v--) {
      if (this.match(v, dt)) return v;
    }
    return undefined;
  }

  dump(indent = ''): string {
    return this.toString();
  }
}
