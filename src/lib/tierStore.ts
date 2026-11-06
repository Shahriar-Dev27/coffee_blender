import { createStore } from 'zustand/vanilla';
import type { Tier } from '@/lib/tier';

function readInitialTier(): Tier {
  // SSR-neutral default is 'low': on the server (or if the boot script did not
  // run) the cheapest tier is the safe choice, so nothing heavy is ever
  // mounted without a positive capability signal from the boot script.
  if (typeof document === 'undefined') return 'low';
  const v = document.documentElement.dataset.tier;
  return v === 'high' || v === 'medium' || v === 'low' ? v : 'low';
}

export interface TierState {
  tier: Tier;
  setTier(t: Tier): void;
}

export const tierStore = createStore<TierState>((set) => ({
  tier: readInitialTier(),
  setTier: (tier) => set({ tier }),
}));
