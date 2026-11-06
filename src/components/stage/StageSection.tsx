import type { CSSProperties } from 'react';
import type { StageDef } from '@/config/stages';
import { COPY } from '@/config/copy';
import { StageCaption } from '@/components/stage/StageCaption';
import { StageStill } from '@/components/stage/StageStill';
import { Callouts } from '@/components/stage/Callouts';
import { OrderPanel } from '@/components/order/OrderPanel';

export function StageSection({ stage }: { stage: StageDef }) {
  const n = stage.id;
  return (
    <section
      id={`stage-${n}`}
      aria-labelledby={`stage-${n}-heading`}
      data-stage={n}
      style={{ '--span': stage.end - stage.start } as CSSProperties}
    >
      <div className="container stage__frame">
        <StageStill stage={n} />
        <StageCaption stage={n} />
        <Callouts stage={n} />
      </div>
      {n === 5 ? (
        <div id="order" className="container stage__order" tabIndex={-1}>
          <OrderPanel />
          <noscript>
            <p>{COPY.noscript}</p>
          </noscript>
        </div>
      ) : null}
    </section>
  );
}
