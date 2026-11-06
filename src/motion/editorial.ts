import { CHAPTERS } from './chapters';

/** Progress-driven editorial transforms. Pure. Transforms only: no opacity, so axe never samples faded text. */
export interface EditorialPose {
  heroWord: { yPercent: number; scale: number };
  heroOrbit: { rotation: number; scale: number };
  stamp: { rotation: number };
}

/** Rest pose. Must equal ritual.css: .hero-orbit rotate(-15deg), .ritual-stamp rotate(12deg). */
export const EDITORIAL_BASE: EditorialPose = {
  heroWord: { yPercent: 0, scale: 1 },
  heroOrbit: { rotation: -15, scale: 1 },
  stamp: { rotation: 12 },
};

const ARRIVAL_END = CHAPTERS[1].progress; // 0.14: the ritual chapter reaches the top
const INVITATION_END = CHAPTERS[2].progress; // 0.27: the flavor chapter reaches the top
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function editorialAt(progress: number): EditorialPose {
  const p = Number.isFinite(progress) ? clamp01(progress) : 0;
  const exit = clamp01(p / ARRIVAL_END);
  const settle = clamp01(p / INVITATION_END);
  return {
    // "0 - x" (not "-x") keeps +0 at rest so toEqual(EDITORIAL_BASE) holds.
    heroWord: { yPercent: 0 - 16 * exit, scale: 1 - 0.06 * exit },
    heroOrbit: { rotation: -15 + 25 * exit, scale: 1 + 0.1 * exit },
    stamp: { rotation: 12 - 20 * settle },
  };
}
