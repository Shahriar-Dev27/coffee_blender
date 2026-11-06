import { STAGES, stillFile, type StageId } from '@/config/stages';

const DESKTOP = { width: 2400, height: 1350 } as const;
const MOBILE_MEDIA = '(max-width: 40rem)';

/** Matched procedural scene cutout. Production Blender stills remain an asset handoff. */
export function StageStill({ stage }: { stage: StageId }) {
  const def = STAGES.find((s) => s.id === stage);
  if (!def) return null;
  const first = stage === 1;
  const cutout = (crop: 'mobile' | 'desktop', ext: 'avif' | 'webp') => stillFile(stage, crop, ext).replace('/poster-', '/cup-');
  const mobileSet = (ext: 'avif' | 'webp') => stage === 1
    ? `${cutout('mobile', ext).replace('1200x1500', '320x400')} 320w, ${cutout('mobile', ext).replace('1200x1500', '480x600')} 480w, ${cutout('mobile', ext).replace('1200x1500', '800x1000')} 800w, ${cutout('mobile', ext)} 1200w`
    : cutout('mobile', ext);
  return (
    <picture className="still">
      <source media={MOBILE_MEDIA} srcSet={mobileSet('avif')} sizes={first ? '292px' : '100vw'} type="image/avif" />
      <source media={MOBILE_MEDIA} srcSet={mobileSet('webp')} sizes={first ? '292px' : '100vw'} type="image/webp" />
      <source srcSet={cutout('desktop', 'avif')} type="image/avif" />
      <source srcSet={cutout('desktop', 'webp')} type="image/webp" />
      <img
        src={cutout('desktop', 'webp')}
        width={DESKTOP.width}
        height={DESKTOP.height}
        alt={def.still.alt}
        loading={first ? 'eager' : 'lazy'}
        fetchPriority={first ? 'high' : undefined}
        decoding={first ? 'sync' : 'async'}
      />
    </picture>
  );
}
