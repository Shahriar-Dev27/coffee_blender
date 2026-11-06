'use client';
import dynamic from 'next/dynamic';
import { Component, useCallback, useEffect, useState, type ReactNode } from 'react';
import { storyProgress } from '@/motion/progress';
const CoffeeScene = dynamic(() => import('@/scene/CoffeeScene'), { ssr: false });
class SceneBoundary extends Component<{ children: ReactNode; onFailure(): void }, { failed: boolean }> {
 state = { failed: false };
 static getDerivedStateFromError() { return { failed: true }; }
 componentDidCatch() { this.props.onFailure(); }
 render() { return this.state.failed ? null : this.props.children; }
}
export function StageVisual() {
 const [enabled, setEnabled] = useState(false);
 const [ready, setReady] = useState(false);
 useEffect(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const size = matchMedia('(min-width: 641px) and (min-height: 601px)');
  let timer: ReturnType<typeof setTimeout>;
  const update = () => {
   clearTimeout(timer);
   const capture = new URLSearchParams(location.search).get('capture');
   const allowed = !reduced.matches && document.documentElement.dataset.tier !== 'low' && (size.matches || capture !== null);
   if (!allowed) { setEnabled(false); delete document.documentElement.dataset.scene; return; }
   timer = setTimeout(() => setEnabled(true), 250);
   if (capture !== null) { storyProgress.set(Number(capture)); document.documentElement.dataset.capture = 'true'; }
  };
  update();
  reduced.addEventListener('change', update); size.addEventListener('change', update);
  return () => { clearTimeout(timer); reduced.removeEventListener('change', update); size.removeEventListener('change', update); delete document.documentElement.dataset.scene; };
 }, []);
 const onFailure = useCallback(() => { setEnabled(false); setReady(false); delete document.documentElement.dataset.scene; }, []);
 const onReady = useCallback(() => { setReady(true); document.documentElement.dataset.scene = 'ready'; }, []);
 return <div className={`scene-layer${ready ? ' is-ready' : ''}`} aria-hidden="true">
  {enabled && <SceneBoundary onFailure={onFailure}><CoffeeScene onReady={onReady} onFailure={onFailure} /></SceneBoundary>}
 </div>;
}
