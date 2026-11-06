import { STAGES, stillFile, type StageId } from '@/config/stages';

const DESKTOP = { width: 2400, height: 1350 } as const;
const MOBILE_MEDIA = '(max-width: 40rem)';

/** Pre-rendered Blender still. Mobile crop first, then desktop; the img is the fallback. */
export function StageStill({ stage }: { stage: StageId }) {
  const def = STAGES.find((s) => s.id === stage);
  if (!def) return null;
  const first = stage === 1;
  return (
    <picture className="still">
      <source media={MOBILE_MEDIA} srcSet={stillFile(stage, 'mobile', 'avif')} type="image/avif" />
      <source media={MOBILE_MEDIA} srcSet={stillFile(stage, 'mobile', 'webp')} type="image/webp" />
      <source srcSet={stillFile(stage, 'desktop', 'avif')} type="image/avif" />
      <source srcSet={stillFile(stage, 'desktop', 'webp')} type="image/webp" />
      <img
        src={stillFile(stage, 'desktop', 'webp')}
        width={DESKTOP.width}
        height={DESKTOP.height}
        alt={def.still.alt}
        loading={first ? 'eager' : 'lazy'}
        fetchPriority={first ? 'high' : undefined}
        decoding="async"
      />
    </picture>
  );
}
