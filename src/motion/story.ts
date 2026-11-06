import { CHAPTERS, progressAt } from './chapters';
import type { Gsap, ScrollTriggerStatic } from './deps';
import { followProgress } from './follow';
import { storyProgress } from './progress';

export interface StoryDriver { isMoving(): boolean; destroy(): void }

/** followProgress does not clamp, so every target handed to it goes through here. */
const clamp01 = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);

/**
 * The single owner of storyProgress on the motion path. Scroll sets a target from measured chapter
 * offsets; the GSAP ticker eases storyProgress toward it with the 0.8 s scrub. Call inside the
 * armMotion gsap.context.
 */
export function createStoryDriver(gsap: Gsap, ScrollTrigger: ScrollTriggerStatic, track: HTMLElement, counter: HTMLElement): StoryDriver {
  let positions: number[] = [];
  let target = clamp01(storyProgress.get());
  let current = target;
  const measure = () => {
    positions = CHAPTERS.map(({ id }) => (document.getElementById(id)?.getBoundingClientRect().top ?? 0) + window.scrollY);
  };
  measure();
  const trigger = ScrollTrigger.create({
    trigger: track, start: 'top top', endTrigger: counter, end: 'top top',
    onUpdate: (self) => { target = clamp01(progressAt(self.scroll(), positions)); },
    // Layout changed (resize, fonts, the pour hold): re-measure and jump straight to the new truth.
    onRefresh: (self) => {
      measure();
      target = current = clamp01(progressAt(self.scroll(), positions));
      storyProgress.set(current);
    },
  });
  const tick = (_time: number, deltaMs: number) => {
    if (current === target) return;
    current = followProgress(current, target, deltaMs / 1000);
    storyProgress.set(current);
  };
  gsap.ticker.add(tick);
  return {
    isMoving: () => current !== target,
    destroy() {
      gsap.ticker.remove(tick);
      trigger.kill();
    },
  };
}
