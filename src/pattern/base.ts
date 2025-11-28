// src/pattern/base.ts
import { DateTime } from 'luxon';
import { LIMITS, ordinal, MONTH_NAMES, DAY_NAMES } from '../utils'; 
import {
  WildcardPattern,
  UnspecifiedPattern,
  SinglePattern,
  RangePattern,
  StepPattern,
  ListPattern,
  LastPattern,
  LastWPattern,
  NearestWeekdayPattern,
  NthPattern,
} from '.';

export type FieldType = 'second' | 'minute' | 'hour' | 'dom' | 'month' | 'dow' | 'year';

export abstract class CronPattern {
  children: CronPattern[] = [];
  value?: number;

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

  _dumpTree(indent: string = ''): string {
    // Leaf nodes (Single, Wildcard, etc.)
    if (this.children.length === 0) {
      if (this instanceof WildcardPattern) return '*';
      if (this instanceof UnspecifiedPattern) return '?';
      if (this instanceof SinglePattern) return this.value.toString();
      if (this instanceof LastPattern) return this.offset === 0 ? 'L' : `L-${this.offset}`;
      if (this instanceof LastWPattern) return 'LW';
      if (this instanceof NearestWeekdayPattern) return `${this.dom}W`;
      if (this instanceof NthPattern) return `${this.dow}#${this.nth}`;
      return this.toString();
    }

    // Container nodes (List, Range, Step)
    let lines: string[] = [];

    if (this instanceof RangePattern) {
      const from = this.children[0]._dumpTree();
      const to = this.children[1]._dumpTree();
      return `${from}-${to}${this.wrapped ? ' (wrapped)' : ''}`;
    }

    if (this instanceof StepPattern) {
      lines.push(this.base._dumpTree(indent + '   '));
      lines.push(`${indent}└─ /${this.step}`);
      return lines.join('\n');
    }

    if (this instanceof ListPattern) {
      for (let i = 0; i < this.children.length; i++) {
        const child = this.children[i];
        const isLast = i === this.children.length - 1;
        const prefix = isLast ? '└─ ' : '├─ ';
        const nextIndent = indent + (isLast ? '   ' : '│  ');
        lines.push(`${indent}${prefix}${child._dumpTree(nextIndent)}`);
      }
      return lines.join('\n');
    }

    return this.toString();
  }
}
