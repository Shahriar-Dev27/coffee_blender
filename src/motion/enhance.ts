import { orderStore } from '@/order/store';
import type { Gsap, LenisConstructor, ScrollTriggerStatic } from './deps';
import { createSmoothScroll } from './smoothScroll';
import { createStoryDriver, type StoryDriver } from './story';
import { registerEases } from './tokens';

export interface MotionDeps {
  gsap: Gsap;
  ScrollTrigger: ScrollTriggerStatic;
  CustomEase: unknown;
  /** null when FLAGS.smoothScroll is off: native wheel scrolling, everything else unchanged. */
  Lenis: LenisConstructor | null;
}
export type MotionState = 'idle' | 'moving';

/**
 * Arms the cinematic layer. Reached only through MotionRoot's dynamic import on the enabled path.
 * The returned disposer restores the page exactly: no Lenis, no inline styles, no data-motion.
 */
export function armMotion({ gsap, ScrollTrigger, CustomEase, Lenis }: MotionDeps): () => void {
  const track = document.querySelector<HTMLElement>('[data-stage-track]');
  const counter = document.getElementById('order');
  if (!track || !counter) return () => {};
  gsap.registerPlugin(ScrollTrigger);
  registerEases(gsap, CustomEase);
  const root = document.documentElement;
  let state: MotionState = 'idle';
  // Set before anything is measured: motion-tier layout (the pour hold) keys off this attribute.
  root.dataset.motion = state;
  const smooth = Lenis ? createSmoothScroll(gsap, ScrollTrigger, Lenis) : null;
  let story: StoryDriver | null = null;
  const ctx = gsap.context(() => {
    story = createStoryDriver(gsap, ScrollTrigger, track, counter);
  });
  smooth?.setPaused(orderStore.getState().drawer);
  const unsubscribeDrawer = orderStore.subscribe((next, prev) => {
    if (next.drawer !== prev.drawer) smooth?.setPaused(next.drawer);
  });
  const watch = () => {
    const next: MotionState = smooth?.isMoving() || story?.isMoving() ? 'moving' : 'idle';
    if (next !== state) {
      state = next;
      root.dataset.motion = next;
    }
  };
  gsap.ticker.add(watch);
  let disposed = false;
  void document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
  ScrollTrigger.refresh();
  return () => {
    if (disposed) return;
    disposed = true;
    gsap.ticker.remove(watch);
    unsubscribeDrawer();
    story?.destroy();
    ctx.revert();
    smooth?.destroy();
    delete root.dataset.motion;
  };
}
