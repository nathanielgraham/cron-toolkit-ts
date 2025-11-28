# cron-toolkit-ts

TypeScript port of Perl's Cron::Toolkit v0.12

Passes all 400+ original Perl tests — including leap years, DST transitions, wrapped ranges (6-2), nth weekdays (1#5), last day of month (L), and every edge case.

## Features

- Full Unix (5-field) and Quartz (7-field) syntax
- All special syntax: L, L-n, LW, nW, #n, nL, wrapped DOW (6-2)
- Both day-of-month and day-of-week may be specified simultaneously (AND logic)
- Full timezone + utc_offset support
- Real DST handling (spring forward skips, fall back repeats)
- Natural language describe() output
- next(), previous(), is_match()

## Installation

npm install cron-toolkit-ts

## Usage

```
import { CronToolkit } from 'cron-toolkit-ts';

const cron = new CronToolkit('0 0 12 ? * 6L *', {
  time_zone: 'America/New_York'
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
  time_zone: 'Europe/London'  // Automatically sets correct offset
  // or
  // utc_offset: 60             // Manual override
});
```

## API

- new CronToolkit(expr, options?)
  - options.time_zone: IANA zone (e.g. "America/New_York")
  - options.utc_offset: Minutes from UTC
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

GitHub: https://github.com/nathanielgraham
Original Perl module: Cron::Toolkit v0.12

## License

MIT 
