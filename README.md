[![Demo](https://img.shields.io/badge/demo-live-blue.svg?style=flat-square&logo=github)](https://nathanielgraham.github.io/cron-toolkit-ts)
[![npm](https://img.shields.io/npm/v/@nathanielgraham/cron-toolkit-ts?style=flat-square&logo=npm)](https://www.npmjs.com/package/@nathanielgraham/cron-toolkit-ts)
[![Tests](https://img.shields.io/badge/tests-400%2B%20passing-brightgreen?style=flat-square)](https://github.com/nathanielgraham/cron-toolkit-ts/actions)

# cron-toolkit-ts

cron-toolkit-ts is a TypeScript library for parsing cron expressions, generating english descriptions, and calculating next and previous occurrences.
This is a faithful port of Cron::Toolkit 0.12, originally written in Perl. Passes all 400+ tests from the original Perl version. 

## Features

- Full 7-field Quartz syntax (seconds and year fields)
- All special tokens supported: L, L-n, LW, nW, #n, nL
- Both day-of-month and day-of-week may be specified simultaneously (AND logic)
- Proper Quartz-compatible DST handling
- Time-zone support via IANA names or fixed UTC offsets
- Natural-language English descriptions
- Full abstract syntax tree and `dumpTree()` for debugging

## Installation

npm install @nathanielgraham/cron-toolkit-ts

## Usage

```
import { CronToolkit } from '@nathanielgraham/cron-toolkit-ts';

const cron = new CronToolkit('0 0 12 ? * 6L *', {
  timeZone: 'America/New_York'
});

console.log(cron.describe());
// "12 PM on the last Saturday of every month"

// When does February 29th next land on a Monday?
const cron = new CronToolkit('0 0 0 29 2 MON *');
console.log(cron.next);

// See what was parsed
console.log(cron.dumpTree());
// ┌─ second: 0
// ├─ minute: 0
// ├─ hour: 12
// ├─ dom: ?
// ├─ month: *
// ├─ dow: 6L
// └─ year: *
```

## Timezone & Offset

```
const cron = new CronToolkit('0 30 9 ? * MON-FRI *', {
  timeZone: 'Europe/London'  // Automatically sets correct offset
  utcOffset: 60              // Manual override
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

# Time zones and DST 

All calculations are performed in the configured time zone.
DST transitions follow Quartz Scheduler rules exactly:

- Spring forward — times that do not exist are skipped
- Fall back — repeated local times fire twice

# Bugs and contributions

[https://github.com/nathanielgraham/cron-toolkit-ts/issues](https://github.com/nathanielgraham/cron-toolkit-ts/issues)

Pull requests with failing test cases are especially welcome — they are the fastest way to get a fix merged.

Thank you!

# Original perl version 

on [CPAN](https://metacpan.org/pod/Cron::Toolkit)

on [Github](https://github.com/nathanielgraham/cron-toolkit-perl)

# Author

[Nathaniel Graham](mailto:ngraham@cpan.org)

## License

MIT 
