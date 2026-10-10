import { describe, expect, it } from 'vitest';
import { addDays, nightsBetween, parseDay, rangesOverlap, todayInColombia } from '../lib/dates';

describe('fechas', () => {
  it('valida fechas reales', () => {
    expect(parseDay('2026-02-28')).not.toBeNull();
    expect(parseDay('2026-02-30')).toBeNull();
    expect(parseDay('26-2-1')).toBeNull();
  });

  it('cuenta noches y suma días cruzando meses', () => {
    expect(nightsBetween('2026-01-30', '2026-02-02')).toBe(3);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('el día de salida no choca con la siguiente llegada', () => {
    expect(rangesOverlap('2026-05-01', '2026-05-03', '2026-05-03', '2026-05-05')).toBe(false);
    expect(rangesOverlap('2026-05-01', '2026-05-04', '2026-05-03', '2026-05-05')).toBe(true);
  });

  it('usa la hora de Colombia', () => {
    // 2:00 a. m. UTC del 10 de octubre son las 9:00 p. m. del 9 en Colombia.
    expect(todayInColombia(new Date('2026-10-10T02:00:00Z'))).toBe('2026-10-09');
  });
});
