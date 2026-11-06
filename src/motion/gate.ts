/** Gates shared by MotionRoot and the motion layer. Pure: no DOM access, no gsap or lenis import. */
export const MOTION_VIEWPORT_QUERY = '(min-width: 641px) and (min-height: 601px)';
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export interface MotionEnv {
  /** window.location.search */
  search: string;
  /** matchMedia(MOTION_VIEWPORT_QUERY).matches */
  viewportOk: boolean;
  /** matchMedia(REDUCED_MOTION_QUERY).matches */
  reducedMotion: boolean;
  /** document.documentElement.dataset.tier */
  tier: string | undefined;
}

/** The rules MotionRoot has always applied: ?capture, small viewports, reduced motion and the low tier opt out. */
export function motionAllowed(env: MotionEnv): boolean {
  if (new URLSearchParams(env.search).has('capture')) return false;
  return env.viewportOk && !env.reducedMotion && env.tier !== 'low';
}

/** Lenis options. Touch stays native (syncTouch false); anchors keep hash + focus semantics. */
export const SMOOTH_SCROLL = {
  lerp: 0.08,
  wheelMultiplier: 0.9,
  smoothWheel: true,
  syncTouch: false,
  anchors: true,
  autoRaf: false,
} as const;
