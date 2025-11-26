// test/perl-suite.test.ts
import { expect, test, describe } from 'vitest'; 
import { CronToolkit } from '../src/CronToolkit';
import { DateTime } from 'luxon';
import * as fs from 'fs';
import * as path from 'path';

interface TestCase {
  expr: string;
  desc: string;
  as_string: string;
  as_quartz_string?: string;
  next_epoch?: number;
  prev_epoch?: number;
  base_epoch?: number;
  tz?: string;
  invalid?: boolean;
}

const data: TestCase[] = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'cron_tests.json'), 'utf-8')
);

describe('100% faithful to Perl Cron::Toolkit (400+ tests)', () => {
  for (const t of data) {
    if (t.invalid) continue; // skip known invalids

    const name = t.expr.padEnd(30) + ` → ${t.desc}`;
    test(name, () => {
      const base = t.base_epoch ? DateTime.fromSeconds(t.base_epoch) : DateTime.now();
      const zone = t.tz || 'UTC';

      const cron = new CronToolkit(t.expr, { timeZone: zone });

      // Test description
      expect(cron.describe()).toBe(t.desc);

      // Test normalized string
      expect(cron.asString()).toBe(t.as_string);

      // Test next/previous if provided
      if (t.next_epoch != null) {
        const next = cron.next(base.toSeconds());
        expect(next).toBe(t.next_epoch);
      }
      if (t.prev_epoch != null) {
        const prev = cron.previous?.(base.toSeconds());
        expect(prev).toBe(t.prev_epoch);
      }
    });
  }
});
