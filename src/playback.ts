import type { Curve } from './motion';

/** Both previews share elapsed milliseconds, while each keeps its own duration. */
export function curveProgress(elapsedMs: number, durationMs: number): number {
  if (!Number.isFinite(elapsedMs) || !Number.isFinite(durationMs) || durationMs <= 0) {
    throw new RangeError('Playback time must be finite and duration must be positive.');
  }
  return Math.max(0, Math.min(1, elapsedMs / durationMs));
}

/** The same piecewise-linear samples used by the original UI and JS export. */
export function readCurve(curve: Curve, progress: number): number {
  const index = Math.max(0, Math.min(1, progress)) * (curve.points.length - 1);
  const left = Math.floor(index);
  const right = Math.min(curve.points.length - 1, left + 1);
  return (
    curve.points[left].value +
    (curve.points[right].value - curve.points[left].value) * (index - left)
  );
}
