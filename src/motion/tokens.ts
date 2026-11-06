// Motion tokens. Source of truth is the BREOU design spec; values must match
// the duration and ease tokens in src/styles/tokens.css.
//
// This module must never import gsap at runtime. GSAP is loaded dynamically
// elsewhere to protect the first-load budget, so callers pass the instances in.

export const MOTION = {
  ease: 'breou',
  easeCss: 'cubic-bezier(0.22, 1, 0.36, 1)',
  feedback: 0.12,
  ui: 0.24,
  panel: 0.48,
  stageText: 0.9,
  scrub: 0.8,
  wordStagger: 0.05,
  lineStagger: 0.1,
  magnetic: { duration: 0.45, maxScale: 1.02, strength: 0.3 },
} as const;

const BREOU_PATH = 'M0,0 C0.22,1 0.36,1 1,1';

/** The subset of the GSAP CustomEase plugin that registerEases relies on. */
export interface CustomEaseLike {
  create(name: string, path: string): unknown;
}

// Guard keyed on both the gsap instance and the CustomEase plugin, so a second
// pair of instances (e.g. a test reset) registers again while a repeat is a no-op.
const registered = new WeakMap<object, WeakSet<object>>();

// The real gsap CustomEase is a class (typeof 'function') with a static create.
function isCustomEaseLike(value: unknown): value is CustomEaseLike {
  const kind = typeof value;
  return (
    (kind === 'function' || (kind === 'object' && value !== null)) &&
    typeof (value as { create?: unknown }).create === 'function'
  );
}

/**
 * Registers the CustomEase plugin with gsap and creates the 'breou' ease.
 * Idempotent per gsap instance: repeat calls are no-ops.
 */
export function registerEases(
  gsap: typeof import('gsap').gsap,
  CustomEase: unknown,
): void {
  if (!isCustomEaseLike(CustomEase)) {
    throw new TypeError(
      'registerEases: CustomEase must be an object with a create(name, path) method',
    );
  }
  let forGsap = registered.get(gsap);
  if (!forGsap) {
    forGsap = new WeakSet<object>();
    registered.set(gsap, forGsap);
  }
  if (forGsap.has(CustomEase)) return;
  gsap.registerPlugin(CustomEase as Parameters<typeof gsap.registerPlugin>[0]);
  CustomEase.create(MOTION.ease, BREOU_PATH);
  forGsap.add(CustomEase);
}
