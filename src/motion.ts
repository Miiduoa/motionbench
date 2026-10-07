export type Spring = { stiffness: number; damping: number; mass: number };
export type Bezier = { x1: number; y1: number; x2: number; y2: number; duration: number };
export type Point = { time: number; value: number };
export type Curve = { points: Point[]; duration: number; overshoot: number; capped: boolean };
export const SPRING_PRESETS = [
  {
    name: 'Balanced',
    note: 'A little life, a clean landing.',
    stiffness: 180,
    damping: 19,
    mass: 1,
  },
  {
    name: 'Snappy',
    note: 'Small controls. Quick feedback.',
    stiffness: 420,
    damping: 33,
    mass: 0.8,
  },
  { name: 'Buoyant', note: 'A noticeable lift and return.', stiffness: 150, damping: 10, mass: 1 },
  { name: 'Gentle', note: 'Unhurried, without overshoot.', stiffness: 90, damping: 24, mass: 1.2 },
];
export const BEZIER_PRESETS = [
  {
    name: 'Standard',
    note: 'A smooth start and finish.',
    x1: 0.4,
    y1: 0,
    x2: 0.2,
    y2: 1,
    duration: 600,
  },
  {
    name: 'Arrive',
    note: 'Fast off the mark. Soft landing.',
    x1: 0.16,
    y1: 1,
    x2: 0.3,
    y2: 1,
    duration: 600,
  },
  {
    name: 'Depart',
    note: 'Build up speed as you leave.',
    x1: 0.7,
    y1: 0,
    x2: 0.84,
    y2: 0,
    duration: 400,
  },
  {
    name: 'Anticipate',
    note: 'A short pull before the move.',
    x1: 0.36,
    y1: -0.35,
    x2: 0.54,
    y2: 1.35,
    duration: 700,
  },
];

function validateSpring(s: Spring) {
  if (![s.stiffness, s.damping, s.mass].every((v) => Number.isFinite(v) && v > 0))
    throw new RangeError('Spring parameters must be finite and positive.');
}

/** Unit step response, zero initial position and velocity; time in seconds. */
export function springAt(time: number, spring: Spring): number {
  validateSpring(spring);
  if (!Number.isFinite(time)) throw new RangeError('Time must be finite.');
  if (time <= 0) return 0;
  const w = Math.sqrt(spring.stiffness / spring.mass);
  const z = spring.damping / (2 * Math.sqrt(spring.stiffness * spring.mass));
  if (Math.abs(z - 1) < 1e-5) return 1 - Math.exp(-w * time) * (1 + w * time);
  if (z < 1) {
    const wd = w * Math.sqrt(1 - z * z);
    return (
      1 - Math.exp(-z * w * time) * (Math.cos(wd * time) + ((z * w) / wd) * Math.sin(wd * time))
    );
  }
  // Separate real roots avoid overflowing cosh/sinh for heavily damped systems.
  const root = Math.sqrt(z * z - 1);
  const r1 = -w / (z + root);
  const r2 = -w * (z + root);
  return 1 - (r2 * Math.exp(r1 * time) - r1 * Math.exp(r2 * time)) / (r2 - r1);
}

export function springCurve(spring: Spring): Curve {
  validateSpring(spring);
  const step = 1 / 120;
  let duration = 12;
  let quietSince: number | null = null;
  let capped = true;
  for (let t = step; t <= 12; t += step) {
    const value = springAt(t, spring);
    const speed = (springAt(t + step, spring) - value) / step;
    if (Math.abs(1 - value) < 0.001 && Math.abs(speed) < 0.01) {
      quietSince ??= t;
      if (t - quietSince >= 0.2) {
        duration = t;
        capped = false;
        break;
      }
    } else quietSince = null;
  }
  const points = Array.from({ length: 181 }, (_, i) => ({
    time: i / 180,
    value: springAt((i / 180) * duration, spring),
  }));
  // Finite CSS animation needs an exact final resting point.
  points[points.length - 1].value = 1;
  return {
    points,
    duration: Math.round(duration * 1000),
    overshoot: Math.max(0, ...points.map((p) => p.value - 1)),
    capped,
  };
}

function cubic(t: number, a: number, b: number) {
  return 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * b + t ** 3;
}
/** Invert monotonic Bézier x by bounded bisection, including flat endpoint tangents. */
export function bezierAt(time: number, b: Bezier): number {
  if (
    ![time, b.x1, b.x2, b.y1, b.y2, b.duration].every(Number.isFinite) ||
    b.x1 < 0 ||
    b.x1 > 1 ||
    b.x2 < 0 ||
    b.x2 > 1 ||
    b.duration <= 0
  )
    throw new RangeError('Invalid cubic Bézier parameters.');
  if (time <= 0) return 0;
  if (time >= 1) return 1;
  let low = 0,
    high = 1;
  for (let i = 0; i < 32; i++) {
    const middle = (low + high) / 2;
    if (cubic(middle, b.x1, b.x2) < time) low = middle;
    else high = middle;
  }
  return cubic((low + high) / 2, b.y1, b.y2);
}
export function bezierCurve(b: Bezier): Curve {
  const points = Array.from({ length: 181 }, (_, i) => ({
    time: i / 180,
    value: bezierAt(i / 180, b),
  }));
  return {
    points,
    duration: b.duration,
    overshoot: Math.max(0, ...points.map((p) => p.value - 1)),
    capped: false,
  };
}
const clean = (number: number, digits = 4) => String(Number(number.toFixed(digits)));
export function cssTiming(curve: Curve, bezier?: Bezier): string {
  if (bezier) return `cubic-bezier(${bezier.x1}, ${bezier.y1}, ${bezier.x2}, ${bezier.y2})`;
  return `linear(\n${curve.points.map((p) => `  ${clean(p.value)} ${clean(p.time * 100, 3)}%`).join(',\n')}\n)`;
}
export function exportCSS(curve: Curve, bezier?: Bezier): string {
  return `/* Motionbench · ${bezier ? 'cubic Bézier' : 'sampled spring'} */\n.motion {\n  --distance: 240px;\n  animation: travel ${curve.duration}ms ${cssTiming(curve, bezier)} both;\n}\n\n@keyframes travel {\n  from { transform: translateX(0); }\n  to { transform: translateX(var(--distance)); }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .motion { animation: none; transform: translateX(var(--distance)); }\n}\n`;
}
export function exportJS(curve: Curve): string {
  return `// Sampled motion · call playMotion(element, distanceInPixels).\nexport function playMotion(element, distance = 240) {\n  const values = [${curve.points.map((p) => clean(p.value)).join(', ')}];\n  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;\n  return element.animate(\n    values.map((value, index) => ({\n      transform: \`translateX(\${value * distance}px)\`,\n      offset: index / (values.length - 1),\n    })),\n    { duration: reduced ? 0 : ${curve.duration}, fill: 'both', easing: 'linear' },\n  );\n}\n`;
}
