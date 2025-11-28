[![Demo](https://img.shields.io/badge/demo-live-blue.svg?style=flat-square&logo=github)](https://nathanielgraham.github.io/cron-toolkit-ts)
[![npm](https://img.shields.io/npm/v/@nathanielgraham/cron-toolkit-ts?style=flat-square&logo=npm)](https://www.npmjs.com/package/@nathanielgraham/cron-toolkit-ts)
[![Tests](https://img.shields.io/badge/tests-400%2B%20passing-brightgreen?style=flat-square)](https://github.com/nathanielgraham/cron-toolkit-ts/actions)

# cron-toolkit-ts

TypeScript port of Perl's Cron::Toolkit v0.12

Passes all 400+ original Perl tests — including leap years, DST transitions, and many edge cases.

## Features

- Full 7-field Quartz syntax (seconds and year fields)
- All special tokens supported: L, L-n, LW, nW, #n, nL
- Both day-of-month and day-of-week may be specified simultaneously (AND logic)
- Proper Quartz-compatible DST handling
- Time-zone support via IANA names or fixed UTC offsets
- Natural-language English descriptions
- Complete crontab parsing with environment variable expansion
- Full abstract syntax tree and `dumpTree()` for debugging

## Installation

npm install cron-toolkit-ts

## Usage

```
import { CronToolkit } from 'cron-toolkit-ts';

const cron = new CronToolkit('0 0 12 ? * 6L *', {
  timeZone: 'America/New_York'
});

console.log(cron.describe());
// "12 PM on the last Saturday of every month"

console.log(cron.dumpTree());
// ┌─ second: 0
// ├─ minute: 0
// ├─ hour: 12
// ├─ dom: ?
// ├─ month: *
// ├─ dow: 6L
// └─ year: *

// Question: when does February 29th next land on a Monday?
const cron = new CronToolkit('0 0 0 29 2 1 *');
console.log(cron.next);
```

## Timezone & Offset

```
const cron = new CronToolkit('0 30 9 ? * MON-FRI *', {
  timeZone: 'Europe/London'  // Automatically sets correct offset
  // or
  // utcOffset: 60             // Manual override
});
```

## API

- new CronToolkit(expr, options?)
  - options.timeZone: IANA zone (e.g. "America/New_York")
  - options.utcOffset: Minutes from UTC
- describe() → human readable string
- next(from?) → next run epoch (UTC)
- previous(from?) → previous run epoch (UTC)
- is_match(epoch) → does this timestamp match?
- asString() → normalized 7-field string
- asQuartzString() → Quartz-compatible string
- dumpTree() → Perl-style debug tree

## Live Demo

https://nathanielgraham.github.io/cron-toolkit-ts

## Author

Nathaniel Graham

GitHub: https://github.com/nathanielgraham/cron-toolkit-perl 
Original Perl module: Cron::Toolkit v0.12

## License

MIT 
