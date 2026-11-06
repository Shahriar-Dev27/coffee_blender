import { MOTION } from './tokens';

/** Below this distance the follower snaps to its target so the scene can stop rendering. */
export const SETTLE_EPSILON = 1e-4;
/** Longest frame the follower integrates; a resumed background tab must not teleport the story. */
export const MAX_STEP_SECONDS = 0.1;

/**
 * Frame-rate independent exponential follow used as the story scrub (MOTION.scrub = 0.8 s):
 * about 98% of the remaining distance is covered after one scrub period. Never overshoots.
 */
export function followProgress(current: number, target: number, dtSeconds: number, scrubSeconds: number = MOTION.scrub): number {
  if (!Number.isFinite(target)) return Number.isFinite(current) ? current : 0;
  if (!Number.isFinite(current) || !(scrubSeconds > 0)) return target;
  const dt = Number.isFinite(dtSeconds) ? Math.min(Math.max(dtSeconds, 0), MAX_STEP_SECONDS) : 0;
  const next = target + (current - target) * Math.exp((-4 * dt) / scrubSeconds);
  return Math.abs(next - target) < SETTLE_EPSILON ? target : next;
}
