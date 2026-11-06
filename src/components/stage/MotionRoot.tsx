'use client';
import { useEffect } from 'react';
import { FLAGS } from '@/config/flags';
import { MOTION_VIEWPORT_QUERY, REDUCED_MOTION_QUERY, motionAllowed } from '@/motion/gate';

/** Gatekeeper only. gsap, ScrollTrigger, CustomEase, Lenis and the motion layer load via import() on the enabled path. */
export function MotionRoot() {
 useEffect(() => {
  let dispose: (() => void) | undefined;
  let cancelled = false;
  let generation = 0;
  const viewport = matchMedia(MOTION_VIEWPORT_QUERY);
  const reduced = matchMedia(REDUCED_MOTION_QUERY);
  const setup = async () => {
   const current = ++generation;
   dispose?.(); dispose = undefined;
   if (!motionAllowed({ search: window.location.search, viewportOk: viewport.matches, reducedMotion: reduced.matches, tier: document.documentElement.dataset.tier })) return;
   const [{ gsap }, { ScrollTrigger }, { CustomEase }, lenis, { armMotion }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
    import('gsap/CustomEase'),
    FLAGS.smoothScroll ? import('lenis') : Promise.resolve(null),
    import('@/motion/enhance'),
   ]);
   if (cancelled || current !== generation) return;
   dispose = armMotion({ gsap, ScrollTrigger, CustomEase, Lenis: lenis ? lenis.default : null });
  };
  // Motion is an enhancement: if a chunk fails to load, the page is already fully visible.
  const run = () => { setup().catch(() => undefined); };
  run();
  viewport.addEventListener('change', run); reduced.addEventListener('change', run);
  return () => { cancelled = true; dispose?.(); viewport.removeEventListener('change', run); reduced.removeEventListener('change', run); };
 }, []);
 return null;
}
