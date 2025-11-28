// src/test-cron.ts
import { CronToolkit } from '../src/CronToolkit';
import { DateTime } from 'luxon';

// Helper to show local time
function fmt(dt: DateTime) {
  return dt.toLocaleString(DateTime.DATETIME_FULL);
}

const tests = [
  {
    expr: '* * * * 3/2',
    name: 'every five minutes on the first of every month'
  },
  {
    expr: '0 0-30/2 0 ? 1 * *',
    name: 'every five minutes on the first of every month'
  },
  {
    expr: '0 0 0 L-1 * ? *',
    name: 'midnight every day of every month from January to March, every month from June to September'
  },
  {
    expr: '0 30 14 ? * 6-2 *',
    tz: 'Europe/London',
    name: '2:30 PM every day from Saturday to Tuesday'
  },
  {
    expr: '1 0 12 * * ?',
    name: 'Daily at noon'
  },
  {
    expr: '0 0 9 ? * MON#1 *',
    tz: 'America/New_York',
    name: 'First Monday of month at 9 AM'
  },
  {
    expr: '0 0 0 L * ? *',
    name: 'Midnight on last day of month'
  },
  {
    expr: '0 0 17 15W * ? *',
    name: '5 PM on nearest weekday to 15th'
  },
  {
    expr: '0 0 0 29 2 ? *',
    name: 'Midnight on Feb 29 (leap year only)'
  },
    
  {
    expr: '2 3 * 29 2 ? *',
    name: 'hms test'
  },
  {
    expr: '@hourly',
    name: 'Hourly alias'
  }
];

console.log('Cron::Toolkit TypeScript Port — Live Test\n');

for (const t of tests) {
  const cron = new CronToolkit(t.expr, { timeZone: t.tz });
  
  console.dir(cron.nodes);
  console.log(`Expression : ${t.expr}`);
  console.log(`asString : ${cron.asString()}`);
  console.log(`Time zone   : ${t.tz || 'UTC'}`);
  console.log(`Description : ${cron.describe()}`);
  
  const now = DateTime.now().setZone(t.tz || 'UTC');
  const next = cron.next(now.toSeconds());
  const prev = cron.previous ? cron.previous(now.toSeconds()) : null;

  if (next) {
    console.log(`Next run    : ${fmt(DateTime.fromSeconds(next).setZone(t.tz || 'UTC'))}`);
  }
  if (prev) {
    console.log(`Previous run: ${fmt(DateTime.fromSeconds(prev).setZone(t.tz || 'UTC'))}`);
  }
  
  console.log('─'.repeat(60));
}
