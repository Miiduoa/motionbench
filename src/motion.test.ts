import { describe, expect, it } from 'vitest';
import {
  bezierAt,
  bezierCurve,
  exportCSS,
  exportJS,
  springAt,
  springCurve,
  SPRING_PRESETS,
} from './motion';

describe('analytic spring', () => {
  it('starts at rest and converges in all three damping regimes', () => {
    for (const damping of [5, 20, 45]) {
      const spring = { mass: 1, stiffness: 100, damping };
      expect(springAt(0, spring)).toBe(0);
      expect(springAt(0.000001, spring)).toBeLessThan(1e-8);
      expect(springAt(12, spring)).toBeCloseTo(1, 6);
    }
  });
  it('matches the closed critical-damping response', () => {
    expect(springAt(0.2, { mass: 1, stiffness: 100, damping: 20 })).toBeCloseTo(
      1 - 3 * Math.exp(-2),
      10,
    );
  });
  it('is continuous around critical damping and stable under heavy damping', () => {
    const s = { mass: 1, stiffness: 100, damping: 20 };
    expect(springAt(0.2, { ...s, damping: 20.0003 })).toBeCloseTo(springAt(0.2, s), 4);
    expect(springAt(0.2, { ...s, damping: 19.9997 })).toBeCloseTo(springAt(0.2, s), 4);
    expect(Number.isFinite(springAt(12, { ...s, damping: 100000 }))).toBe(true);
  });
  it('has overshoot only when underdamped', () => {
    expect(springCurve({ mass: 1, stiffness: 100, damping: 5 }).overshoot).toBeGreaterThan(0.4);
    expect(springCurve({ mass: 1, stiffness: 100, damping: 20 }).overshoot).toBe(0);
    expect(springCurve({ mass: 1, stiffness: 100, damping: 45 }).overshoot).toBe(0);
  });
  it('produces finite samples with strictly increasing time and exact export endpoints', () => {
    for (const s of [
      ...SPRING_PRESETS,
      { stiffness: 40, damping: 5, mass: 2 },
      { stiffness: 500, damping: 50, mass: 0.2 },
    ]) {
      const curve = springCurve(s);
      expect(curve.points[0]).toEqual({ time: 0, value: 0 });
      expect(curve.points.at(-1)).toEqual({ time: 1, value: 1 });
      expect(curve.duration).toBeGreaterThan(0);
      for (let i = 1; i < curve.points.length; i++) {
        expect(curve.points[i].time).toBeGreaterThan(curve.points[i - 1].time);
        expect(Number.isFinite(curve.points[i].value)).toBe(true);
      }
    }
  });
  it('marks unsettled duration caps instead of claiming a settled spring', () => {
    expect(springCurve({ mass: 100, stiffness: 1, damping: 0.001 }).capped).toBe(true);
  });
  it('rejects zero, negative, and nonfinite inputs', () => {
    for (const damping of [0, -1, NaN, Infinity])
      expect(() => springAt(1, { mass: 1, stiffness: 100, damping })).toThrow(RangeError);
  });
});
describe('cubic Bézier', () => {
  const linear = { x1: 0, y1: 0, x2: 1, y2: 1, duration: 600 };
  it('inverts time correctly even for flat endpoint tangents', () => {
    for (const time of [0, 0.001, 0.1, 0.5, 0.8, 0.999, 1])
      expect(bezierAt(time, linear)).toBeCloseTo(time, 8);
  });
  it('allows overshoot in y while keeping time valid', () => {
    expect(
      bezierCurve({ ...linear, x1: 0.3, y1: 1.4, x2: 0.7, y2: 1.4 }).overshoot,
    ).toBeGreaterThan(0);
    expect(() => bezierAt(0.5, { ...linear, x1: -0.1 })).toThrow(RangeError);
    expect(() => bezierAt(0.5, { ...linear, duration: 0 })).toThrow(RangeError);
  });
});
describe('export contracts', () => {
  const curve = springCurve(SPRING_PRESETS[0]);
  it('exports CSS with exact offset endpoints, duration, and reduced-motion support', () => {
    const css = exportCSS(curve);
    expect(css).toContain('0 0%');
    expect(css).toContain('1 100%');
    expect(css).toContain(`${curve.duration}ms linear(`);
    expect(css).toContain('prefers-reduced-motion: reduce');
  });
  it('exports exact cubic CSS rather than sampled timing for Bézier curves', () => {
    const b = { x1: 0.4, y1: 0, x2: 0.2, y2: 1, duration: 600 };
    expect(exportCSS(bezierCurve(b), b)).toContain('600ms cubic-bezier(0.4, 0, 0.2, 1)');
  });
  it('generates executable JavaScript keyframes with uniform offsets and the correct endpoint', () => {
    const fn = new Function(
      'matchMedia',
      `${exportJS(curve).replace('export function', 'function')}; return playMotion;`,
    )(() => ({ matches: false }));
    let result:
      { frames: { offset: number; transform: string }[]; opts: { duration: number } } | undefined;
    fn(
      {
        animate: (frames: { offset: number; transform: string }[], opts: { duration: number }) => {
          result = { frames, opts };
        },
      },
      300,
    );
    expect(result!.frames[0]).toEqual({ transform: 'translateX(0px)', offset: 0 });
    expect(result!.frames.at(-1)).toEqual({ transform: 'translateX(300px)', offset: 1 });
    expect(result!.opts.duration).toBe(curve.duration);
  });
  it('uses an immediate final state for reduced-motion JavaScript and returns the Animation', () => {
    const fn = new Function(
      'matchMedia',
      `${exportJS(curve).replace('export function', 'function')}; return playMotion;`,
    )(() => ({ matches: true }));
    const animation = { cancel: () => undefined };
    let duration = -1;
    const actual = fn({
      animate: (_frames: unknown, opts: { duration: number }) => {
        duration = opts.duration;
        return animation;
      },
    });
    expect(duration).toBe(0);
    expect(actual).toBe(animation);
  });
});
