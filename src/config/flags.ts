// Feature flags. Each flag is a compile-time constant.

export const FLAGS = {
  /** Lenis wheel smoothing on the desktop motion tier. false = native wheel scrolling, everything else unchanged. */
  smoothScroll: true,
} as const;
