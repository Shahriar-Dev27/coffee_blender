import type { ReactNode } from 'react';
import { StageVisual } from '@/components/stage/StageVisual';

export function StageTrack({ children }: { children: ReactNode }) {
  return (
    <div data-stage-track>
      <StageVisual />
      {children}
    </div>
  );
}
