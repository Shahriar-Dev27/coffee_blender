'use client';
import { useEffect } from 'react';
import { storyProgress } from '@/motion/progress';
import { CHAPTERS, progressAt } from '@/motion/chapters';
export function MotionRoot() {
 useEffect(() => {
  let dispose: (() => void) | undefined;
  let cancelled = false;
  let generation = 0;
  const viewport = matchMedia('(min-width: 641px) and (min-height: 601px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const setup = async () => {
   const current = ++generation;
   dispose?.(); dispose = undefined;
   if (new URLSearchParams(window.location.search).has('capture')) return;
   if (!viewport.matches || reduced.matches || document.documentElement.dataset.tier === 'low') return;
   const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
   if (cancelled || current !== generation) return;
   gsap.registerPlugin(ScrollTrigger);
   const track = document.querySelector<HTMLElement>('[data-stage-track]');
   const counter = document.getElementById('order');
   if (!track || !counter) return;
   let positions: number[] = [];
   const measure = () => { positions = CHAPTERS.map(({ id }) => (document.getElementById(id)?.getBoundingClientRect().top ?? 0) + window.scrollY); };
   measure();
   const trigger = ScrollTrigger.create({
    trigger: track, start: 'top top', endTrigger: counter, end: 'top top',
    onUpdate: (self) => storyProgress.set(progressAt(self.scroll(), positions)),
    onRefresh: (self) => { measure(); storyProgress.set(progressAt(self.scroll(), positions)); },
   });
   ScrollTrigger.refresh();
   dispose = () => trigger.kill();
  };
  void setup();
  const update = () => { void setup(); };
  viewport.addEventListener('change', update); reduced.addEventListener('change', update);
  return () => { cancelled = true; dispose?.(); viewport.removeEventListener('change', update); reduced.removeEventListener('change', update); };
 }, []);
 return null;
}
