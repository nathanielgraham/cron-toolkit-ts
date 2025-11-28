// src/CronToolkit.ts
import { DateTime } from 'luxon';
import {
  ALIASES,
  DOW_MAP_UNIX,
  MONTH_MAP,
  LIMITS,
  ordinal,
  formatTime,
} from './utils';
import {
  CronPattern,
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
} from './pattern';

type FieldType =
  | 'second'
  | 'minute'
  | 'hour'
  | 'dom'
  | 'month'
  | 'dow'
  | 'year';

export class CronToolkit {
  private nodes: CronPattern[] = [];
  private _timeZone: string = 'UTC';
  private _utcOffset = 0;
  private _beginEpoch = DateTime.now().minus({ years: 10 }).toSeconds();
  private _endEpoch = DateTime.now().plus({ years: 10 }).toSeconds();

  constructor(
    public readonly expression: string,
    options: { time_zone?: string; utc_offset?: number } = {}
  ) {
    if (options.utc_offset != null) this.utc_offset = options.utc_offset;
    if (options.time_zone != null) this.time_zone = options.time_zone;
    this.parse(expression);
  }

  get time_zone(): string { return this._timeZone; }
  set time_zone(tz: string) {
    const dt = DateTime.now().setZone(tz);
    if (!dt.isValid) throw new Error(`Invalid time_zone: ${tz}`);
    this._timeZone = tz;
    this._utcOffset = Math.round(dt.offset);
  }

  get utc_offset(): number { return this._utcOffset; }
  set utc_offset(offset: number) {
    if (!Number.isInteger(offset) || offset < -1080 || offset > 1080) {
      throw new Error('utc_offset must be integer minutes between -1080 and +1080');
    }
    this._utcOffset = offset;
    this._timeZone = 'UTC';
  }

  get begin_epoch(): number { return this._beginEpoch; }
  set begin_epoch(epoch: number) {
    if (epoch < 0) throw new Error('begin_epoch must be >= 0');
    this._beginEpoch = epoch;
  }

  get end_epoch(): number | undefined {
    return this._endEpoch === Infinity ? undefined : this._endEpoch;
  }
  set end_epoch(epoch: number | undefined) {
    this._endEpoch = epoch ?? Infinity;
  }

  private parse(expr: string) {
    let e = expr.trim().toUpperCase().replace(/\s+/g, ' ');
    if (e.startsWith('@') && ALIASES[e]) e = ALIASES[e]!;
    let fields = e.split(' ');
    if (fields.length === 5) fields.unshift('0');
    if (fields.length === 6) fields.push('*');
    if (fields.length !== 7) throw new Error('Expected 5–7 fields');

    fields[4] = fields[4].replace(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/g, m => MONTH_MAP[m]);
    fields[5] = fields[5].replace(/\b(SUN|MON|TUE|WED|THU|FRI|SAT)\b/g, m => DOW_MAP_UNIX[m].toString());

    if (fields[3] !== '?' && fields[5] === '*') fields[5] = '?';
    if (fields[3] === '*' && fields[5] !== '?') fields[3] = '?';
    if (fields[3] === '?' && fields[5] === '?') {
      throw new Error('dow and dom cannot both be unspecified');
    }

    const types: FieldType[] = ['second', 'minute', 'hour', 'dom', 'month', 'dow', 'year'];
    this.nodes = fields.map((f, i) => this._optimizeNode(this.buildNode(types[i], f), types[i]));
    this.finalizeDow(this.nodes[5]);
  }

  private finalizeDow(node: CronPattern): void {
    if (node.children.length > 0) {
      for (const child of node.children) this.finalizeDow(child);
    } else if (node instanceof SinglePattern && node.value === 0) {
      node.value = 7;
    }
  }

  private buildNode(field: FieldType, value: string): CronPattern {
    const [min, max] = LIMITS[field];

    if (value === '*') return new WildcardPattern(field);
    if (value === '?') return new UnspecifiedPattern(field);

    if (/^\d+$/.test(value)) {
      let n = +value;
      if (field === 'dow' && n === 0) n = 7;
      if (n < min || n > max) throw new Error(`${field} ${n} out of range [${min}-${max}]`);
      return new SinglePattern(field, n);
    }

    if (value.includes(',')) {
      const list = new ListPattern(field);
      for (const part of value.split(',')) {
        if (!part) throw new Error(`Empty list element in ${field}`);
        list.addChild(this.buildNode(field, part));
      }
      return list;
    }

    if (/^(\*|\d+)-(\d+)$/.test(value)) {
      const match = value.match(/^(\*|\d+)-(\d+)$/)!;
      let start = match[1] === '*' ? min : +match[1];
      let end = +match[2];
      if (field === 'dow' && start === 0) start = 7;
      if (field === 'dow' && end === 0) end = 7;
      const wrapped = field === 'dow' && start > end;
      return new RangePattern(field, start, end, wrapped);
    }

    if (value.includes('/')) {
      const [base, stepStr] = value.split('/');
      const step = +stepStr;
      if (isNaN(step) || step <= 0) throw new Error(`Invalid step: ${stepStr}`);
      const baseNode = this.buildNode(field, base === '*' ? '*' : base);
      return new StepPattern(field, baseNode, step);
    }

    if (field === 'dom') {
      if (value === 'L') return new LastPattern(field, 0);
      if (value === 'LW') return new LastWPattern(field);
      if (value.endsWith('W')) {
        const day = +value.slice(0, -1);
        if (isNaN(day) || day < 1 || day > 31) throw new Error(`Invalid W day: ${value}`);
        return new NearestWeekdayPattern(field, day);
      }
      if (/^L-?(\d*)$/.test(value)) {
        const offset = value === 'L' ? 0 : +(value.match(/L-?(\d+)/)?.[1] || 0);
        return new LastPattern(field, offset);
      }
    }

    if (field === 'dow') {
      if (value === 'L') return new LastPattern(field, 0, 7);
      if (value.endsWith('L')) {
        const dow = +value.slice(0, -1);
        if (isNaN(dow) || dow < 1 || dow > 7) throw new Error(`Invalid L day: ${value}`);
        return new LastPattern(field, 0, dow);
      }
      if (/#/.test(value)) {
        const [dowStr, nthStr] = value.split('#');
        const dow = +dowStr;
        const nth = +nthStr;
        if (isNaN(dow) || dow < 1 || dow > 7 || isNaN(nth) || nth < 1 || nth > 5) {
          throw new Error(`Invalid # syntax: ${value}`);
        }
        return new NthPattern(field, dow, nth);
      }
    }

    throw new Error(`Invalid ${field}: ${value}`);
  }

  private _optimizeNode(node: CronPattern, field: FieldType): CronPattern {
    if (node instanceof StepPattern) {
      const base = node.base;
      const step = node.step;
      const values: number[] = [];

      if (base instanceof WildcardPattern) {
        const [min, max] = LIMITS[field];
        for (let v = min; v <= max; v += step) values.push(v);
      } else if (base instanceof SinglePattern) {
        for (let v = base.value; v <= LIMITS[field][1]; v += step) values.push(v);
      } else if (base instanceof RangePattern) {
        const min = (base.children[0] as SinglePattern).value;
        const max = (base.children[1] as SinglePattern).value;
        for (let v = min; v <= max; v += step) values.push(v);
      }

      if (values.length === 0) return new WildcardPattern(field);
      if (values.length === 1) return new SinglePattern(field, values[0]);

      const optimizedBase = this._optimizeNode(base, field);
      if (optimizedBase !== base) {
        return new StepPattern(field, optimizedBase, step);
      }
    }

    if (node instanceof ListPattern) {
      const singles = node.children
        .filter(c => c instanceof SinglePattern)
        .map(c => (c as SinglePattern).value)
        .sort((a, b) => a - b);

      if (singles.length >= 2 && singles[singles.length - 1] - singles[0] === singles.length - 1) {
        return new RangePattern(field, singles[0], singles[singles.length - 1]);
      }
    }

    return node;
  }

  private _setField(dt: DateTime, field: string, value: number): DateTime {
    switch (field) {
      case 'second': return dt.set({ second: value });
      case 'minute': return dt.set({ minute: value });
      case 'hour':   return dt.set({ hour: value });
      default:       return dt;
    }
  }

  private _plus_one(dt: DateTime, field: FieldType): DateTime {
    switch (field) {
      case 'second':  return dt.plus({ seconds: 1 });
      case 'minute':  return dt.plus({ minutes: 1 });
      case 'hour':    return dt.plus({ hours: 1 });
      case 'dom':     return dt.plus({ days: 1 });
      case 'month':   return dt.plus({ months: 1 });
      case 'dow':     return dt.plus({ weeks: 1 });
      case 'year':    return dt.plus({ years: 1 });
      default:        return dt;
    }
  }

  private _minus_one(dt: DateTime, field: FieldType): DateTime {
    switch (field) {
      case 'second':  return dt.minus({ seconds: 1 });
      case 'minute':  return dt.minus({ minutes: 1 });
      case 'hour':    return dt.minus({ hours: 1 });
      case 'dom':     return dt.minus({ days: 1 });
      case 'month':   return dt.minus({ months: 1 });
      case 'dow':     return dt.minus({ weeks: 1 });
      case 'year':    return dt.minus({ years: 1 });
      default:        return dt;
    }
  }

  next(from?: number): number | null {
    const baseSeconds = from ?? DateTime.now().toSeconds();
    let dt = DateTime.fromSeconds(baseSeconds + this._utcOffset * 60, { zone: 'UTC' }).plus({ seconds: 1 });

    NODE: for (let i = 0; i <= 2; i++) {
      const node = this.nodes[i];
      const field = node.fieldType;
      const curval = field === 'second' ? dt.second : field === 'minute' ? dt.minute : dt.hour;
      const lowval = node.lowest(dt) ?? 0;
      const highval = node.highest(dt) ?? 59;

      if (curval >= highval) {
        dt = this._setField(dt, field, lowval);
        dt = this._plus_one(dt, this.nodes[i + 1].fieldType);
        continue NODE;
      }

      for (let c = curval; c <= highval; c++) {
        const test = this._setField(dt, field, c);
        if (this.matches(test)) return test.toSeconds() - this._utcOffset * 60;
      }

      dt = this._setField(dt, field, lowval);
      dt = this._plus_one(dt, this.nodes[i + 1].fieldType);
    }

    const yearNode = this.nodes[6];
    const yearHigh = yearNode.highest(dt) ?? dt.year;
    if (dt.year > yearHigh) dt = dt.set({ year: yearHigh });

    const maxDate = DateTime.fromObject({ year: 2099, month: 12, day: 31 }, { zone: 'UTC' });
    while (dt <= maxDate) {
      if (this.matches(dt)) return dt.toSeconds() - this._utcOffset * 60;
      dt = dt.plus({ days: 1 });
    }

    return null;
  }

  previous(from?: number): number | null {
    const baseSeconds = from ?? DateTime.now().toSeconds();
    let dt = DateTime.fromSeconds(baseSeconds + this._utcOffset * 60, { zone: 'UTC' }).minus({ seconds: 1 });

    NODE: for (let i = 0; i <= 2; i++) {
      const node = this.nodes[i];
      const field = node.fieldType;
      const curval = field === 'second' ? dt.second : field === 'minute' ? dt.minute : dt.hour;
      const lowval = node.lowest(dt) ?? 0;
      const highval = node.highest(dt) ?? 59;

      if (curval <= lowval) {
        dt = this._setField(dt, field, highval);
        dt = this._minus_one(dt, this.nodes[i + 1].fieldType);
        continue NODE;
      }

      for (let c = curval; c >= lowval; c--) {
        const test = this._setField(dt, field, c);
        if (this.matches(test)) return test.toSeconds() - this._utcOffset * 60;
      }

      dt = this._setField(dt, field, highval);
      dt = this._minus_one(dt, this.nodes[i + 1].fieldType);
    }

    const yearNode = this.nodes[6];
    const yearHigh = yearNode.highest(dt) ?? dt.year;
    if (dt.year > yearHigh) dt = dt.set({ year: yearHigh });

    const minDate = DateTime.fromObject({ year: 1970, month: 1, day: 1 }, { zone: 'UTC' });
    while (dt >= minDate) {
      if (this.matches(dt)) return dt.toSeconds() - this._utcOffset * 60;
      dt = dt.minus({ days: 1 });
    }

    return null;
  }

  private matches(dt: DateTime): boolean {
    return this.nodes.every((node, i) => {
      const value = [
        dt.second,
        dt.minute,
        dt.hour,
        dt.day,
        dt.month,
        dt.weekday,
        dt.year,
      ][i];
      return node.match(value, dt);
    });
  }

  describe(): string {
    const filtered = this.nodes.map((node, i, arr) =>
      node instanceof WildcardPattern && i > 0 && arr[i - 1] instanceof WildcardPattern ? null : node
    );
    const hmsNodes = filtered.slice(0, 3).filter(Boolean) as CronPattern[];
    const wildHMS = hmsNodes.every(n => n instanceof WildcardPattern);
    const singleHMS = hmsNodes.every(n => n instanceof SinglePattern);
    let hms = '';
    if (wildHMS && hmsNodes.length > 0) {
      hms = hmsNodes[0].toEnglish();
    } else if (singleHMS && hmsNodes.length === 3) {
      const [s, m, h] = hmsNodes.map(n => (n as SinglePattern).value);
      hms = formatTime(s, m, h);
    } else {
      hms = filtered
        .slice(0, 3)
        .filter((n): n is CronPattern =>
           n !== null && !(n instanceof SinglePattern && n.value === 0)
        )
        .map(n => n.toEnglish())
        .join(' of ');
    }
    let rest = '';
    const dom = filtered[3];
    const month = this.nodes[4];
    const dow = filtered[5];
    const year = this.nodes[6];
    if (dom && !(dom instanceof UnspecifiedPattern)) {
      if (dom instanceof SinglePattern) {
        rest += 'on ';
      }
      rest += dom.toEnglish();
      rest += ' of ' + month.toEnglish();
    }
    if (dow && !(dow instanceof UnspecifiedPattern)) {
      if (rest) rest += ' and ';
      if (dow instanceof SinglePattern) {
        rest += 'every ';
      }
      rest += dow.toEnglish() + ' of ' + month.toEnglish();
    }
    if (!(year instanceof WildcardPattern)) {
      rest += ' ' + year.toEnglish();
    }
    return hms + (rest ? ' ' + rest : '');
  }

  asString(): string {
    return this.nodes.map(n => n.toString()).join(' ');
  }

  asQuartzString(): string {
    let str = this.asString();
    const fields = str.split(' ');
    if (fields.length < 6) return str;
    const dow = fields[5].replace(/\b([1-7])\b/g, m => {
      const n = parseInt(m);
      return n === 7 ? '1' : (n + 1).toString();
    });
    fields[5] = dow;
    return fields.join(' ');
  }

  dumpTree(): string {
    const names = ['second', 'minute', 'hour', 'dom', 'month', 'dow', 'year'];
    const lines: string[] = [];

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const name = names[i];
      const isLast = i === this.nodes.length - 1;
      const prefix = i === 0 ? '┌─' : isLast ? '└─ ' : '├─ ';
      const tree = node._dumpTree('   ').trim();
      lines.push(`${prefix}${name}: ${tree}`);
    }
    return lines.join('\n');
  }
}
