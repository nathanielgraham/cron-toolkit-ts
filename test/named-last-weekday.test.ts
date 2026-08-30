import { expect, test, describe } from 'vitest';
import { CronToolkit } from '../src/CronToolkit';

describe('Named last-weekday aliases (Perl 1.04)', () => {
  test('MONL stores as 1L', () => {
    const monl = new CronToolkit('0 0 12 ? * MONL *');
    const oneL = new CronToolkit('0 0 12 ? * 1L *');
    expect(monl.asString()).toBe('0 0 12 ? * 1L *');
    expect(monl.asString()).toBe(oneL.asString());
  });

  test('SUNL stores as 7L', () => {
    const sunl = new CronToolkit('0 0 12 ? * SUNL *');
    const sevenL = new CronToolkit('0 0 12 ? * 7L *');
    expect(sunl.asString()).toBe('0 0 12 ? * 7L *');
    expect(sunl.asString()).toBe(sevenL.asString());
  });

  test('THUL stores as 4L', () => {
    const thul = new CronToolkit('0 0 12 ? * THUL *');
    const fourL = new CronToolkit('0 0 12 ? * 4L *');
    expect(thul.asString()).toBe('0 0 12 ? * 4L *');
    expect(thul.asString()).toBe(fourL.asString());
  });

  test('MON#3 still stores as 1#3', () => {
    expect(new CronToolkit('0 0 12 ? * MON#3 *').asString()).toBe('0 0 12 ? * 1#3 *');
  });

  test('MON-FRI still works', () => {
    expect(new CronToolkit('0 0 9 ? * MON-FRI *').asString()).toBe('0 0 9 ? * 1-5 *');
  });

  test('numeric 1L still works', () => {
    expect(new CronToolkit('0 0 12 ? * 1L *').asString()).toBe('0 0 12 ? * 1L *');
  });

  test('MONX still throws', () => {
    expect(() => new CronToolkit('0 0 12 ? * MONX *')).toThrow();
  });
});
