import { DateTime, Zone } from 'luxon';
import {
  ALIASES, DOW_MAP_UNIX, DOW_MAP_QUARTZ, MONTH_MAP, LIMITS,
  ordinal, formatTime
} from './utils';
import {
  CronPattern, WildcardPattern, UnspecifiedPattern, SinglePattern,
  RangePattern, StepPattern, ListPattern, LastPattern, LastWPattern,
  NearestWeekdayPattern, NthPattern
} from './pattern';

type FieldType = 'second' | 'minute' | 'hour' | 'dom' | 'month' | 'dow' | 'year';

export class CronToolkit {
  private nodes: CronPattern[] = [];
  private timeZone: string | Zone = 'UTC';
  private beginEpoch = DateTime.now().minus({ years: 10 }).toSeconds();
  private endEpoch = DateTime.now().plus({ years: 10 }).toSeconds();

  constructor(
    public readonly expression: string,
    options: { timeZone?: string | Zone } = {}
  ) {
    if (options.timeZone) this.timeZone = options.timeZone;
    this.parse(expression);
  }

  private parse(expr: string) {
    let e = expr.trim().toUpperCase().replace(/\s+/g, ' ');
    if (e.startsWith('@') && ALIASES[e]) e = ALIASES[e];

    let fields = e.split(' ');
    if (fields.length === 5) fields.unshift('0');
    if (fields.length === 6) fields.push('*');
    if (fields.length !== 7) throw new Error('Expected 5–7 fields');

    // Normalize month/day names
    fields[4] = fields[4].replace(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/g, m => MONTH_MAP[m]);
    fields[5] = fields[5].replace(/\b(SUN|MON|TUE|WED|THU|FRI|SAT)\b/g, m => DOW_MAP_UNIX[m].toString());

    // ? logic
    if (fields[3] !== '?' && fields[5] === '*') fields[5] = '?';
    if (fields[3] === '*' && fields[5] !== '?') fields[3] = '?';

    const types: FieldType[] = ['second', 'minute', 'hour', 'dom', 'month', 'dow', 'year'];
    this.nodes = fields.map((f, i) => this.buildNode(types[i], f));
    // Finalize DOW: 0 → 7
    if (this.nodes[5]) {
      this.finalizeDow(this.nodes[5]);
    }
  }

// In CronToolkit.ts — after _build_tree equivalent
private finalizeDow(node: CronPattern): void {
  if (node.children.length > 0) {
    for (const child of node.children) {
      this.finalizeDow(child);
    }
  } else if (node instanceof SinglePattern && node.value === 0) {
    node.value = 7;
  }
}

  private buildNode(field: FieldType, value: string): CronPattern {
    if (value === '*') return new WildcardPattern(field);
    if (value === '?') return new UnspecifiedPattern(field);

    if (/^\d+$/.test(value)) {
      const n = +value;
      const [min, max] = LIMITS[field];
      if (n < min || n > max) throw new Error(`${field} ${n} out of range`);
      return new SinglePattern(field, n);
    }

    if (value.includes('-') && !value.includes('/')) {
      const [a, b] = value.split('-').map(Number);
      const wrapped = field === 'dow' && a > b;
      return new RangePattern(field, a, b, wrapped);
    }

    if (value.includes('/')) {
      const [base, step] = value.split('/');
      const stepVal = +step;
      const baseNode = base === '*' ? new WildcardPattern(field) : this.buildNode(field, base);
      return new StepPattern(field, baseNode, stepVal);
    }

    if (value.includes(',')) {
      const list = new ListPattern(field);
      for (const part of value.split(',')) {
        list.addChild(this.buildNode(field, part));
      }
      return list;
    }

    // Special cases
    if (field === 'dom') {
      if (value === 'L') return new LastPattern(field, 0);
      if (value === 'LW') return new LastWPattern(field);
      if (value.endsWith('W')) {
        const day = value === 'W' ? 1 : +value.slice(0, -1);
        return new NearestWeekdayPattern(field, day);
      }
      if (/^L-?(\d*)$/.test(value)) {
        const offset = value === 'L' ? 0 : +(value.match(/L-?(\d*)/)![1] || 0);
        return new LastPattern(field, offset);
      }
    }

    if (field === 'dow') {
      if (value === 'L') return new LastPattern(field, 0, 7);
      if (value.endsWith('L')) {
        const dow = +value.slice(0, -1);
        return new LastPattern(field, 0, dow);
      }
      if (/#/.test(value)) {
        const [dow, nth] = value.split('#').map(Number);
        return new NthPattern(field, dow, nth);
      }
    }

    throw new Error(`Invalid ${field}: ${value}`);
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
      //hms = hmsNodes.map(n => n.toEnglish()).join(' of ');
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
      rest += dom.toEnglish();
      rest += ' of ' + month.toEnglish();
    }
    if (dow && !(dow instanceof UnspecifiedPattern)) {
      if (rest) rest += ' and ';
      rest += dow.toEnglish();
      if (!(dom instanceof UnspecifiedPattern)) rest += ' of ' + month.toEnglish();
    }
    if (!(year instanceof WildcardPattern)) {
      rest += ' ' + year.toEnglish();
    }

    return hms + (rest ? ' ' + rest : '');
  }

  next(from?: number): number | null {
    let dt = DateTime.fromSeconds(from ?? DateTime.now().toSeconds(), { zone: this.timeZone }).plus({ seconds: 1 });

    // HMS fast path
    for (let i = 0; i < 3; i++) {
      const node = this.nodes[i];
      const current = [dt.second, dt.minute, dt.hour][i];
      const high = node.highest(dt) ?? -1;
      if (current >= high) {
        dt = dt.set({ [node.fieldType === 'second' ? 'second' : node.fieldType === 'minute' ? 'minute' : 'hour']: node.lowest(dt) });
        dt = dt.plus({ [i === 0 ? 'minutes' : i === 1 ? 'hours' : 'days']: 1 });
        continue;
      }
      for (let v = current; v <= high; v++) {
        const test = dt.set({ [node.fieldType]: v });
        if (this.matches(test)) return test.toSeconds();
      }
      dt = dt.set({ [node.fieldType]: node.lowest(dt) });
      dt = dt.plus({ [i === 0 ? 'minutes' : i === 1 ? 'hours' : 'days']: 1 });
    }

    // Day-by-day search
    const max = DateTime.fromObject({ year: 2099, month: 12, day: 31 }, { zone: this.timeZone });
    while (dt < max) {
      if (this.matches(dt)) return dt.toSeconds();
      dt = dt.plus({ days: 1 });
    }
    return null;
  }

  private matches(dt: DateTime): boolean {
    return this.nodes.every((node, i) => {
      const value = [dt.second, dt.minute, dt.hour, dt.day, dt.month, dt.weekday, dt.year][i];
      return node.match(value, dt);
    });
  }

  dumpTree(): string {
    const names = ['second', 'minute', 'hour', 'dom', 'month', 'dow', 'year'];
    return this.nodes.map((node, i) => {
      const prefix = i === 0 ? 'first' : i === this.nodes.length - 1 ? 'last' : 'middle';
      return `${prefix} ${names[i]}: ${node.dump()}`;
    }).join('\n');
  }

// Add to src/CronToolkit.ts

/** Normalized 7-field string — internal representation (DOW: 1=Monday) */
asString(): string {
  return this.nodes.map(node => node.toString()).join(' ');
}

/** Quartz-compatible string — DOW: 1=Sunday, 7=Saturday */
asQuartzString(): string {
  let str = this.asString();
  const fields = str.split(' ');
  if (fields.length < 6) return str;

  const dow = fields[5];
  // Convert internal DOW (1=Monday → 7=Sunday) to Quartz (1=Sunday → 7=Saturday)
  const quartzDow = dow.replace(/\b([1-7])\b/g, match => {
    const n = parseInt(match);
    return n === 7 ? '1' : (n + 1).toString(); // 7→1, 1→2, ..., 6→7
  });

  fields[5] = quartzDow;
  return fields.join(' ');
}
}
