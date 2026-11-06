import { COPY } from '@/config/copy';
import type { StageId } from '@/config/stages';

/** Static for now: Task 17 adds the staged reveal. Stage 1 carries the h1, the sentence and the action. */
export function StageCaption({ stage }: { stage: StageId }) {
  if (stage === 1) {
    return (
      <div className="caption">
        <h1 id="stage-1-heading" tabIndex={-1}>
          {COPY.hero.headline}
        </h1>
        <p className="caption__text">{COPY.hero.sentence}</p>
        <a className="btn btn--primary" href="#order">
          {COPY.hero.action}
        </a>
      </div>
    );
  }
  const caption =
    stage === 2 ? COPY.stages[2].caption('House Blend') : COPY.stages[stage].caption;
  return (
    <div className="caption">
      <h2 id={`stage-${stage}-heading`}>{COPY.stages[stage].heading}</h2>
      <p className="caption__text">{caption}</p>
    </div>
  );
}
