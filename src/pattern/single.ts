import { CronPattern } from './base';

export class SinglePattern extends CronPattern {
  constructor(fieldType: FieldType, value: number) {
    super(fieldType, value);
  }

  match(v: number): boolean {
    return v === this.value;
  }

  toEnglish(): string {
    let rv = this.englishValue();
    if (this.fieldType === 'second' || this.fieldType === 'minute' || this.fieldType === 'hour') {
      rv = `${this.fieldType} ${rv}`;
    }
    return rv;
  }

  toString(): string {
    return this.value!.toString();
  }

  lowest(): number { return this.value as number; }
  highest(): number { return this.value as number; }
}
