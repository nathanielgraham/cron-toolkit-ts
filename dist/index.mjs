// src/CronToolkit.ts
import { DateTime } from "luxon";

// src/utils/index.ts
var MONTH_MAP = {
  JAN: "1",
  FEB: "2",
  MAR: "3",
  APR: "4",
  MAY: "5",
  JUN: "6",
  JUL: "7",
  AUG: "8",
  SEP: "9",
  OCT: "10",
  NOV: "11",
  DEC: "12",
  JANUARY: "1",
  FEBRUARY: "2",
  MARCH: "3",
  APRIL: "4",
  JUNE: "6",
  JULY: "7",
  AUGUST: "8",
  SEPTEMBER: "9",
  OCTOBER: "10",
  NOVEMBER: "11",
  DECEMBER: "12"
};
var MONTH_NAMES = {
  1: "January",
  2: "February",
  3: "March",
  4: "April",
  5: "May",
  6: "June",
  7: "July",
  8: "August",
  9: "September",
  10: "October",
  11: "November",
  12: "December"
};
var DAY_NAMES = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday"
};
var DOW_MAP_UNIX = {
  SUN: 7,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
  SUNDAY: 7,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6
};
var LIMITS = {
  second: [0, 59],
  minute: [0, 59],
  hour: [0, 23],
  dom: [1, 31],
  month: [1, 12],
  dow: [1, 7],
  year: [1970, 2099]
};
var ALIASES = {
  "@YEARLY": "0 0 0 1 1 ? *",
  "@ANNUALLY": "0 0 0 1 1 ? *",
  "@MONTHLY": "0 0 0 L * ? *",
  "@WEEKLY": "0 0 0 ? * 1 *",
  "@DAILY": "0 0 0 * * ? *",
  "@MIDNIGHT": "0 0 0 * * ? *",
  "@HOURLY": "0 0 * * * ? *"
};
function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function formatTime(sec, min, hour) {
  if (hour === 0 && min === 0 && sec === 0) return "midnight";
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  if (sec) {
    return `${h12}:${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")} ${ampm}`;
  }
  if (min) {
    return `${h12}:${min.toString().padStart(2, "0")} ${ampm}`;
  }
  return `${h12} ${ampm}`;
}

// src/pattern/base.ts
var CronPattern = class {
  constructor(fieldType, value) {
    this.fieldType = fieldType;
    this.value = value;
  }
  children = [];
  value;
  addChild(child) {
    this.children.push(child);
  }
  // THE ONE TRUE english_value() — exactly like Perl
  englishValue() {
    if (this.value === void 0) {
      throw new Error("missing value");
    }
    if (this.fieldType === "dom") {
      return `the ${ordinal(this.value)}`;
    }
    if (this.fieldType === "month") {
      return MONTH_NAMES[this.value];
    }
    if (this.fieldType === "dow") {
      return DAY_NAMES[this.value];
    }
    return this.value.toString();
  }
  englishUnit() {
    let unit = this.fieldType === "dom" || this.fieldType === "dow" ? "day" : this.fieldType;
    if ("value" in this && typeof this.value === "number" && this.value !== 1 && this.fieldType !== "year") {
      unit += "s";
    }
    return unit;
  }
  lowest(dt) {
    const [min, max] = LIMITS[this.fieldType];
    const actualMax = this.fieldType === "dom" ? dt.daysInMonth : max;
    for (let v = min; v <= actualMax; v++) {
      if (this.match(v, dt)) return v;
    }
    return void 0;
  }
  highest(dt) {
    const [min, max] = LIMITS[this.fieldType];
    const actualMax = this.fieldType === "dom" ? dt.daysInMonth : max;
    for (let v = actualMax; v >= min; v--) {
      if (this.match(v, dt)) return v;
    }
    return void 0;
  }
  dump(indent = "") {
    return this.toString();
  }
  _dumpTree(indent = "") {
    if (this.children.length === 0) {
      if (this instanceof WildcardPattern) return "*";
      if (this instanceof UnspecifiedPattern) return "?";
      if (this instanceof SinglePattern) return this.value.toString();
      if (this instanceof LastPattern) return this.offset === 0 ? "L" : `L-${this.offset}`;
      if (this instanceof LastWPattern) return "LW";
      if (this instanceof NearestWeekdayPattern) return `${this.dom}W`;
      if (this instanceof NthPattern) return `${this.dow}#${this.nth}`;
      return this.toString();
    }
    let lines = [];
    if (this instanceof RangePattern) {
      const from = this.children[0]._dumpTree();
      const to = this.children[1]._dumpTree();
      return `${from}-${to}${this.wrapped ? " (wrapped)" : ""}`;
    }
    if (this instanceof StepPattern) {
      lines.push(this.base._dumpTree(indent + "   "));
      lines.push(`${indent}\u2514\u2500 /${this.step}`);
      return lines.join("\n");
    }
    if (this instanceof ListPattern) {
      for (let i = 0; i < this.children.length; i++) {
        const child = this.children[i];
        const isLast = i === this.children.length - 1;
        const prefix = isLast ? "\u2514\u2500 " : "\u251C\u2500 ";
        const nextIndent = indent + (isLast ? "   " : "\u2502  ");
        lines.push(`${indent}${prefix}${child._dumpTree(nextIndent)}`);
      }
      return lines.join("\n");
    }
    return this.toString();
  }
};

// src/pattern/wildcard.ts
var WildcardPattern = class extends CronPattern {
  match() {
    return true;
  }
  toEnglish() {
    return `every ${this.englishUnit()}`;
  }
  toString() {
    return "*";
  }
};

// src/pattern/unspecified.ts
var UnspecifiedPattern = class extends CronPattern {
  match() {
    return true;
  }
  toEnglish() {
    return "";
  }
  toString() {
    return "?";
  }
};

// src/pattern/single.ts
var SinglePattern = class extends CronPattern {
  constructor(fieldType, value) {
    super(fieldType, value);
  }
  match(v) {
    return v === this.value;
  }
  toEnglish() {
    let rv = this.englishValue();
    if (this.fieldType === "second" || this.fieldType === "minute" || this.fieldType === "hour") {
      rv = `${this.fieldType} ${rv}`;
    }
    return rv;
  }
  toString() {
    return this.value.toString();
  }
  lowest() {
    return this.value;
  }
  highest() {
    return this.value;
  }
};

// src/pattern/range.ts
var RangePattern = class extends CronPattern {
  wrapped = false;
  constructor(fieldType, start, end, wrapped = false) {
    super(fieldType);
    this.addChild(new SinglePattern(fieldType, start));
    this.addChild(new SinglePattern(fieldType, end));
    this.wrapped = wrapped;
  }
  match(v, dt) {
    const min = this.children[0].value;
    const max = this.children[1].value;
    if (this.fieldType === "dow" && this.wrapped) {
      return v >= min || v <= max;
    }
    return v >= min && v <= max;
  }
  toEnglish() {
    const from = this.children[0].englishValue();
    const to = this.children[1].englishValue();
    return `every ${this.englishUnit()} from ${from} to ${to}`;
  }
  toString() {
    return `${this.children[0]}-${this.children[1]}`;
  }
};

// src/pattern/step.ts
var StepPattern = class extends CronPattern {
  constructor(fieldType, base, step) {
    super(fieldType);
    this.base = base;
    this.step = step;
    this.addChild(base);
  }
  match(v, dt) {
    if (this.step <= 0) return false;
    if (this.base instanceof WildcardPattern) {
      return v % this.step === 0;
    }
    if (this.base instanceof SinglePattern) {
      return v >= this.base.value && (v - this.base.value) % this.step === 0;
    }
    if (this.base instanceof RangePattern) {
      const min = this.base.children[0].value;
      const max = this.base.children[1].value;
      return v >= min && v <= max && (v - min) % this.step === 0;
    }
    return false;
  }
  toEnglish() {
    let s = `every ${this.step} ${this.englishUnit()}`;
    if (this.step != 1) {
      s += "s";
    }
    ;
    if (this.base instanceof RangePattern) {
      const from = this.base.children[0].englishValue();
      const to = this.base.children[1].englishValue();
      s += ` from ${from} to ${to}`;
    } else if (this.base instanceof SinglePattern) {
      s += " starting ";
      if (/^second|minute|hour$/.test(this.base.fieldType)) {
        s += "at ";
      } else {
        s += "on ";
      }
      s += this.base.englishValue();
    }
    return s;
  }
  toString() {
    return `${this.base}/${this.step}`;
  }
};

// src/pattern/list.ts
var ListPattern = class extends CronPattern {
  match(v, dt) {
    return this.children.some((child) => child.match(v, dt));
  }
  toEnglish() {
    return this.children.map((c) => c.toEnglish()).join(", ");
  }
  toString() {
    return this.children.join(",");
  }
};

// src/pattern/last.ts
var LastPattern = class extends CronPattern {
  offset = 0;
  dow;
  constructor(fieldType, offset = 0, dow) {
    super(fieldType);
    this.offset = offset;
    this.dow = dow;
  }
  match(v, dt) {
    if (this.fieldType === "dom") {
      return dt.day === dt.daysInMonth - this.offset;
    }
    if (this.fieldType === "dow") {
      const target = this.dow ?? 7;
      const lastDay = dt.daysInMonth;
      const lastDt = dt.set({ day: lastDay });
      const daysBack = (lastDt.weekday - target + 7) % 7;
      return dt.day === lastDay - daysBack;
    }
    return false;
  }
  toEnglish() {
    if (this.fieldType === "dom") {
      return this.offset === 0 ? "on the last day" : `on the ${ordinal(this.offset)} to last day`;
    }
    return `on the last ${DAY_NAMES[this.dow ?? 7]}`;
  }
  toString() {
    if (this.fieldType === "dom") {
      return this.offset === 0 ? "L" : `L-${this.offset}`;
    }
    return this.dow ? `${this.dow}L` : "L";
  }
};

// src/pattern/lastW.ts
var LastWPattern = class extends CronPattern {
  match(v, dt) {
    let candidate = dt.daysInMonth;
    while (candidate >= 1) {
      const test = dt.set({ day: candidate });
      if (test.weekday >= 1 && test.weekday <= 5) {
        return dt.day === candidate;
      }
      candidate--;
    }
    return false;
  }
  toEnglish() {
    return "on the last weekday";
  }
  toString() {
    return "LW";
  }
};

// src/pattern/nearestWeekday.ts
var NearestWeekdayPattern = class extends CronPattern {
  constructor(fieldType, dom) {
    super(fieldType);
    this.dom = dom;
  }
  match(v, dt) {
    if (this.dom < 1 || this.dom > dt.daysInMonth) return false;
    const target = dt.set({ day: this.dom });
    const wd = target.weekday;
    if (wd >= 2 && wd <= 5) return dt.day === this.dom;
    const before = target.minus({ days: 1 });
    const after = target.plus({ days: 1 });
    return before.weekday >= 1 && before.weekday <= 5 && dt.day === this.dom - 1 || after.weekday >= 1 && after.weekday <= 5 && dt.day === this.dom + 1 && this.dom + 1 <= dt.daysInMonth;
  }
  toEnglish() {
    return `on the nearest weekday to the ${ordinal(this.dom)}`;
  }
  toString() {
    return `${this.dom}W`;
  }
};

// src/pattern/nth.ts
var NthPattern = class extends CronPattern {
  constructor(fieldType, dow, nth) {
    super(fieldType);
    this.dow = dow;
    this.nth = nth;
  }
  match(v, dt) {
    if (dt.weekday !== this.dow) return false;
    let count = 0;
    for (let d = 1; d < dt.day; d++) {
      if (dt.set({ day: d }).weekday === this.dow) count++;
    }
    return count + 1 === this.nth;
  }
  toEnglish() {
    return `on the ${ordinal(this.nth)} ${DAY_NAMES[this.dow]}`;
  }
  toString() {
    return `${this.dow}#${this.nth}`;
  }
};

// src/CronToolkit.ts
var CronToolkit = class {
  constructor(expression, options = {}) {
    this.expression = expression;
    if (options.utcOffset != null) this.utcOffset = options.utcOffset;
    if (options.timeZone != null) this.timeZone = options.timeZone;
    this.parse(expression);
  }
  nodes = [];
  _timeZone = "UTC";
  _utcOffset = 0;
  _beginEpoch = DateTime.now().minus({ years: 10 }).toSeconds();
  _endEpoch = DateTime.now().plus({ years: 10 }).toSeconds();
  get timeZone() {
    return this._timeZone;
  }
  set timeZone(tz) {
    const dt = DateTime.now().setZone(tz);
    if (!dt.isValid) throw new Error(`Invalid time_zone: ${tz}`);
    this._timeZone = tz;
    this._utcOffset = Math.round(dt.offset);
  }
  get utcOffset() {
    return this._utcOffset;
  }
  set utcOffset(offset) {
    if (!Number.isInteger(offset) || offset < -1080 || offset > 1080) {
      throw new Error("utc_offset must be integer minutes between -1080 and +1080");
    }
    this._utcOffset = offset;
    this._timeZone = "UTC";
  }
  get begin_epoch() {
    return this._beginEpoch;
  }
  set begin_epoch(epoch) {
    if (epoch < 0) throw new Error("begin_epoch must be >= 0");
    this._beginEpoch = epoch;
  }
  get end_epoch() {
    return this._endEpoch === Infinity ? void 0 : this._endEpoch;
  }
  set end_epoch(epoch) {
    this._endEpoch = epoch ?? Infinity;
  }
  parse(expr) {
    let e = expr.trim().toUpperCase().replace(/\s+/g, " ");
    if (e.startsWith("@") && ALIASES[e]) e = ALIASES[e];
    let fields = e.split(" ");
    if (fields.length === 5) fields.unshift("0");
    if (fields.length === 6) fields.push("*");
    if (fields.length !== 7) throw new Error("Expected 5\u20137 fields");
    fields[4] = fields[4].replace(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/g, (m) => MONTH_MAP[m]);
    fields[5] = fields[5].replace(/\b(SUN|MON|TUE|WED|THU|FRI|SAT)\b/g, (m) => DOW_MAP_UNIX[m].toString());
    if (fields[3] !== "?" && fields[5] === "*") fields[5] = "?";
    if (fields[3] === "*" && fields[5] !== "?") fields[3] = "?";
    if (fields[3] === "?" && fields[5] === "?") {
      throw new Error("dow and dom cannot both be unspecified");
    }
    const types = ["second", "minute", "hour", "dom", "month", "dow", "year"];
    this.nodes = fields.map((f, i) => this._optimizeNode(this.buildNode(types[i], f), types[i]));
    this.finalizeDow(this.nodes[5]);
  }
  finalizeDow(node) {
    if (node.children.length > 0) {
      for (const child of node.children) this.finalizeDow(child);
    } else if (node instanceof SinglePattern && node.value === 0) {
      node.value = 7;
    }
  }
  buildNode(field, value) {
    const [min, max] = LIMITS[field];
    if (value === "*") return new WildcardPattern(field);
    if (value === "?") return new UnspecifiedPattern(field);
    if (/^\d+$/.test(value)) {
      let n = +value;
      if (field === "dow" && n === 0) n = 7;
      if (n < min || n > max) throw new Error(`${field} ${n} out of range [${min}-${max}]`);
      return new SinglePattern(field, n);
    }
    if (value.includes(",")) {
      const list = new ListPattern(field);
      for (const part of value.split(",")) {
        if (!part) throw new Error(`Empty list element in ${field}`);
        list.addChild(this.buildNode(field, part));
      }
      return list;
    }
    if (/^(\*|\d+)-(\d+)$/.test(value)) {
      const match = value.match(/^(\*|\d+)-(\d+)$/);
      let start = match[1] === "*" ? min : +match[1];
      let end = +match[2];
      if (field === "dow" && start === 0) start = 7;
      if (field === "dow" && end === 0) end = 7;
      const wrapped = field === "dow" && start > end;
      return new RangePattern(field, start, end, wrapped);
    }
    if (value.includes("/")) {
      const [base, stepStr] = value.split("/");
      const step = +stepStr;
      if (isNaN(step) || step <= 0) throw new Error(`Invalid step: ${stepStr}`);
      const baseNode = this.buildNode(field, base === "*" ? "*" : base);
      return new StepPattern(field, baseNode, step);
    }
    if (field === "dom") {
      if (value === "L") return new LastPattern(field, 0);
      if (value === "LW") return new LastWPattern(field);
      if (value.endsWith("W")) {
        const day = +value.slice(0, -1);
        if (isNaN(day) || day < 1 || day > 31) throw new Error(`Invalid W day: ${value}`);
        return new NearestWeekdayPattern(field, day);
      }
      if (/^L-?(\d*)$/.test(value)) {
        const offset = value === "L" ? 0 : +(value.match(/L-?(\d+)/)?.[1] || 0);
        return new LastPattern(field, offset);
      }
    }
    if (field === "dow") {
      if (value === "L") return new LastPattern(field, 0, 7);
      if (value.endsWith("L")) {
        const dow = +value.slice(0, -1);
        if (isNaN(dow) || dow < 1 || dow > 7) throw new Error(`Invalid L day: ${value}`);
        return new LastPattern(field, 0, dow);
      }
      if (/#/.test(value)) {
        const [dowStr, nthStr] = value.split("#");
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
  _optimizeNode(node, field) {
    if (node instanceof StepPattern) {
      const base = node.base;
      const step = node.step;
      const values = [];
      if (base instanceof WildcardPattern) {
        const [min, max] = LIMITS[field];
        for (let v = min; v <= max; v += step) values.push(v);
      } else if (base instanceof SinglePattern) {
        for (let v = base.value; v <= LIMITS[field][1]; v += step) values.push(v);
      } else if (base instanceof RangePattern) {
        const min = base.children[0].value;
        const max = base.children[1].value;
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
      const singles = node.children.filter((c) => c instanceof SinglePattern).map((c) => c.value).sort((a, b) => a - b);
      if (singles.length >= 2 && singles[singles.length - 1] - singles[0] === singles.length - 1) {
        return new RangePattern(field, singles[0], singles[singles.length - 1]);
      }
    }
    return node;
  }
  _setField(dt, field, value) {
    switch (field) {
      case "second":
        return dt.set({ second: value });
      case "minute":
        return dt.set({ minute: value });
      case "hour":
        return dt.set({ hour: value });
      default:
        return dt;
    }
  }
  _plus_one(dt, field) {
    switch (field) {
      case "second":
        return dt.plus({ seconds: 1 });
      case "minute":
        return dt.plus({ minutes: 1 });
      case "hour":
        return dt.plus({ hours: 1 });
      case "dom":
        return dt.plus({ days: 1 });
      case "month":
        return dt.plus({ months: 1 });
      case "dow":
        return dt.plus({ weeks: 1 });
      case "year":
        return dt.plus({ years: 1 });
      default:
        return dt;
    }
  }
  _minus_one(dt, field) {
    switch (field) {
      case "second":
        return dt.minus({ seconds: 1 });
      case "minute":
        return dt.minus({ minutes: 1 });
      case "hour":
        return dt.minus({ hours: 1 });
      case "dom":
        return dt.minus({ days: 1 });
      case "month":
        return dt.minus({ months: 1 });
      case "dow":
        return dt.minus({ weeks: 1 });
      case "year":
        return dt.minus({ years: 1 });
      default:
        return dt;
    }
  }
  next(from) {
    const baseSeconds = from ?? DateTime.now().toSeconds();
    let dt = DateTime.fromSeconds(baseSeconds + this._utcOffset * 60, { zone: "UTC" }).plus({ seconds: 1 });
    NODE: for (let i = 0; i <= 2; i++) {
      const node = this.nodes[i];
      const field = node.fieldType;
      const curval = field === "second" ? dt.second : field === "minute" ? dt.minute : dt.hour;
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
    const maxDate = DateTime.fromObject({ year: 2099, month: 12, day: 31 }, { zone: "UTC" });
    while (dt <= maxDate) {
      if (this.matches(dt)) return dt.toSeconds() - this._utcOffset * 60;
      dt = dt.plus({ days: 1 });
    }
    return null;
  }
  previous(from) {
    const baseSeconds = from ?? DateTime.now().toSeconds();
    let dt = DateTime.fromSeconds(baseSeconds + this._utcOffset * 60, { zone: "UTC" }).minus({ seconds: 1 });
    NODE: for (let i = 0; i <= 2; i++) {
      const node = this.nodes[i];
      const field = node.fieldType;
      const curval = field === "second" ? dt.second : field === "minute" ? dt.minute : dt.hour;
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
    const minDate = DateTime.fromObject({ year: 1970, month: 1, day: 1 }, { zone: "UTC" });
    while (dt >= minDate) {
      if (this.matches(dt)) return dt.toSeconds() - this._utcOffset * 60;
      dt = dt.minus({ days: 1 });
    }
    return null;
  }
  matches(dt) {
    return this.nodes.every((node, i) => {
      const value = [
        dt.second,
        dt.minute,
        dt.hour,
        dt.day,
        dt.month,
        dt.weekday,
        dt.year
      ][i];
      return node.match(value, dt);
    });
  }
  describe() {
    const filtered = this.nodes.map(
      (node, i, arr) => node instanceof WildcardPattern && i > 0 && arr[i - 1] instanceof WildcardPattern ? null : node
    );
    const hmsNodes = filtered.slice(0, 3).filter(Boolean);
    const wildHMS = hmsNodes.every((n) => n instanceof WildcardPattern);
    const singleHMS = hmsNodes.every((n) => n instanceof SinglePattern);
    let hms = "";
    if (wildHMS && hmsNodes.length > 0) {
      hms = hmsNodes[0].toEnglish();
    } else if (singleHMS && hmsNodes.length === 3) {
      const [s, m, h] = hmsNodes.map((n) => n.value);
      hms = formatTime(s, m, h);
    } else {
      hms = filtered.slice(0, 3).filter(
        (n) => n !== null && !(n instanceof SinglePattern && n.value === 0)
      ).map((n) => n.toEnglish()).join(" of ");
    }
    let rest = "";
    const dom = filtered[3];
    const month = this.nodes[4];
    const dow = filtered[5];
    const year = this.nodes[6];
    if (dom && !(dom instanceof UnspecifiedPattern)) {
      if (dom instanceof SinglePattern) {
        rest += "on ";
      }
      rest += dom.toEnglish();
      rest += " of " + month.toEnglish();
    }
    if (dow && !(dow instanceof UnspecifiedPattern)) {
      if (rest) rest += " and ";
      if (dow instanceof SinglePattern) {
        rest += "every ";
      }
      rest += dow.toEnglish() + " of " + month.toEnglish();
    }
    if (!(year instanceof WildcardPattern)) {
      rest += " " + year.toEnglish();
    }
    return hms + (rest ? " " + rest : "");
  }
  asString() {
    return this.nodes.map((n) => n.toString()).join(" ");
  }
  asQuartzString() {
    let str = this.asString();
    const fields = str.split(" ");
    if (fields.length < 6) return str;
    const dow = fields[5].replace(/\b([1-7])\b/g, (m) => {
      const n = parseInt(m);
      return n === 7 ? "1" : (n + 1).toString();
    });
    fields[5] = dow;
    return fields.join(" ");
  }
  dumpTree() {
    const names = ["second", "minute", "hour", "dom", "month", "dow", "year"];
    const lines = [];
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const name = names[i];
      const isLast = i === this.nodes.length - 1;
      const prefix = i === 0 ? "\u250C\u2500" : isLast ? "\u2514\u2500 " : "\u251C\u2500 ";
      const tree = node._dumpTree("   ").trim();
      lines.push(`${prefix}${name}: ${tree}`);
    }
    return lines.join("\n");
  }
};
export {
  CronToolkit
};
