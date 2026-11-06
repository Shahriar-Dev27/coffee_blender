import { MathUtils } from 'three';

/** Below this gap an eased scene value snaps to its target, mirroring SETTLE_EPSILON in motion/follow.ts. */
export const SCENE_SETTLE_EPSILON = 1e-3;

/**
 * MathUtils.damp that lands exactly on the target once the remaining gap is below the epsilon.
 * The demand-driven scene can then stop on a true fixed point (value === target) instead of a
 * near-converged value that would creep by a rounding step on the next unrelated redraw.
 */
export function dampSettled(current: number, target: number, lambda: number, dt: number, epsilon: number = SCENE_SETTLE_EPSILON): number {
  const next = MathUtils.damp(current, target, lambda, dt);
  return Math.abs(next - target) < epsilon ? target : next;
}
