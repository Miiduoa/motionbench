import { describe, expect, it } from 'vitest';
import { bezierCurve, springCurve, SPRING_PRESETS } from './motion';
import { curveProgress, readCurve } from './playback';

describe('component comparison playback', () => {
  it('plays both candidates against elapsed time instead of stretching the faster curve', () => {
    const short = bezierCurve({ x1: 0, y1: 0, x2: 1, y2: 1, duration: 300 });
    const long = bezierCurve({ x1: 0, y1: 0, x2: 1, y2: 1, duration: 1200 });
    expect(readCurve(short, curveProgress(300, short.duration))).toBe(1);
    expect(readCurve(long, curveProgress(300, long.duration))).toBeCloseTo(0.25);
    expect(readCurve(short, curveProgress(1200, short.duration))).toBe(1);
    expect(readCurve(long, curveProgress(1200, long.duration))).toBe(1);
  });

  it('preserves spring overshoot in component previews', () => {
    const spring = springCurve(SPRING_PRESETS[2]);
    const peak = spring.points.reduce((a, b) => (a.value > b.value ? a : b));
    const progress = curveProgress(peak.time * spring.duration, spring.duration);
    expect(readCurve(spring, progress)).toBeCloseTo(peak.value);
    expect(readCurve(spring, progress)).toBeGreaterThan(1);
  });

  it('holds the endpoint during the comparison pause and at reduced-motion rest', () => {
    const spring = springCurve(SPRING_PRESETS[0]);
    expect(readCurve(spring, curveProgress(-20, spring.duration))).toBe(0);
    expect(readCurve(spring, curveProgress(12000, spring.duration))).toBe(1);
    expect(readCurve(spring, 1)).toBe(1);
  });

  it('rejects invalid timing inputs', () => {
    expect(() => curveProgress(0, 0)).toThrow(RangeError);
    expect(() => curveProgress(NaN, 300)).toThrow(RangeError);
    expect(() => curveProgress(20, Infinity)).toThrow(RangeError);
  });
});
