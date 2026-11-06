import type { Gsap, LenisConstructor, ScrollTriggerStatic } from './deps';
import { SMOOTH_SCROLL } from './gate';

export interface SmoothScroll {
  isMoving(): boolean;
  setPaused(paused: boolean): void;
  destroy(): void;
}

/** Lenis on the GSAP ticker, synced with ScrollTrigger. The native scroll position stays authoritative. */
export function createSmoothScroll(gsap: Gsap, ScrollTrigger: ScrollTriggerStatic, Lenis: LenisConstructor): SmoothScroll {
  const lenis = new Lenis({
    ...SMOOTH_SCROLL,
    // The checkout <dialog> scrolls natively; Lenis must not swallow its wheel events.
    prevent: (node) => node.nodeName === 'DIALOG',
  });
  const offScroll = lenis.on('scroll', ScrollTrigger.update);
  const raf = (time: number) => { lenis.raf(time * 1000); };
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  let destroyed = false;
  return {
    isMoving: () => lenis.isScrolling !== false,
    setPaused(paused) {
      if (paused) lenis.stop();
      else lenis.start();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      offScroll();
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33); // GSAP defaults
      lenis.destroy();
    },
  };
}
