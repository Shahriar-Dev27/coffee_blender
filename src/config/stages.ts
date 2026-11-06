// Single source of truth for the five scroll stages and their stills.
// Boundaries are half-open [start, end). Stage 5 also includes progress 1.

export type StageId = 1 | 2 | 3 | 4 | 5;

export interface StageStill {
  slug: string;
  alt: string;
  placeholder: boolean;
  stillProgress: number;
}

export interface CalloutAnchor {
  id: 'blend' | 'milk' | 'sweetener';
  /** Position as [x, y] in percent of the stage frame, desktop crop. */
  desktop: [number, number];
  /** Position as [x, y] in percent of the stage frame, mobile crop. */
  mobile: [number, number];
}

export interface StageDef {
  id: StageId;
  name: string;
  start: number;
  end: number;
  still: StageStill;
  callouts: CalloutAnchor[];
}

/** Scroll range driving progress 0 to 1. The whole track is 600svh including the final viewport. */
export const TRACK_SCROLL_SVH = 500;

export const STAGES: readonly StageDef[] = [
  {
    id: 1,
    name: 'Cup',
    start: 0,
    end: 0.14,
    still: {
      slug: 'cup',
      alt: 'An empty ceramic cup in close-up on a dark brown ground.',
      placeholder: true,
      stillProgress: 0.07,
    },
    callouts: [],
  },
  {
    id: 2,
    name: 'Blend',
    start: 0.14,
    end: 0.34,
    still: {
      slug: 'blend',
      alt: 'Coffee beans swirling around the empty cup.',
      placeholder: true,
      stillProgress: 0.26,
    },
    callouts: [
      { id: 'blend', desktop: [66, 38], mobile: [50, 22] },
    ],
  },
  {
    id: 3,
    name: 'Beans in',
    start: 0.34,
    end: 0.54,
    still: {
      slug: 'beans-in',
      alt: 'Beans falling into the cup as espresso forms.',
      placeholder: true,
      stillProgress: 0.5,
    },
    callouts: [],
  },
  {
    id: 4,
    name: 'Milk and extras',
    start: 0.54,
    end: 0.78,
    still: {
      slug: 'milk',
      alt: 'Milk pouring into the espresso, with honey beside the cup.',
      placeholder: true,
      stillProgress: 0.7,
    },
    callouts: [
      { id: 'milk', desktop: [70, 30], mobile: [58, 18] },
      { id: 'sweetener', desktop: [58, 62], mobile: [40, 40] },
    ],
  },
  {
    id: 5,
    name: 'Your cup',
    start: 0.78,
    end: 1,
    still: {
      slug: 'final',
      alt: 'The finished cup with milk, foam and honey.',
      placeholder: true,
      stillProgress: 1,
    },
    callouts: [],
  },
];

const STILL_SIZES = {
  desktop: { w: 2400, h: 1350 },
  mobile: { w: 1200, h: 1500 },
} as const;

/** Public path of a Blender still, following `{asset}-{stage-or-variant}-{w}x{h}.{ext}`. */
export function stillFile(
  stage: StageId,
  crop: 'desktop' | 'mobile',
  ext: 'avif' | 'webp',
): string {
  const def = STAGES.find((s) => s.id === stage);
  if (!def) {
    throw new RangeError(`Unknown stage: ${stage}`);
  }
  const { w, h } = STILL_SIZES[crop];
  return `/assets/poster-s${stage}-${def.still.slug}-${w}x${h}.${ext}`;
}
