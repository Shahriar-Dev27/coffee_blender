import { STAGES } from '@/config/stages';

/** Stage links. The current stage and the progress rule are driven by Task 13; static here. */
export function StageRail() {
  return (
    <nav className="rail" aria-label="Stages">
      <ol>
        {STAGES.map((s, i) => (
          <li key={s.id}>
            <a href={`#stage-${s.id}`} aria-current={i === 0 ? 'step' : undefined}>
              <span className="rail__name">{s.name}</span>
            </a>
          </li>
        ))}
      </ol>
      <span className="rail__progress" aria-hidden="true" />
    </nav>
  );
}
