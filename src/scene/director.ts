/** The only authored scene timeline. All transforms are pure functions of progress. */
export interface ScenePose {
  x: number; y: number; rx: number; ry: number; rz: number; scale: number;
  cameraY: number; cameraZ: number; beans: number; pour: number; milk: number; fill: number; saucer: number;
}

const keys: (ScenePose & { at: number })[] = [
  { at: 0, x: 0.4, y: -0.1, rx: 0.18, ry: -0.36, rz: -0.22, scale: 1.3, cameraY: 3.9, cameraZ: 8.5, beans: 0, pour: 0, milk: 1, fill: 1, saucer: 0 },
  { at: 0.14, x: 0.9, y: 0, rx: 0, ry: -0.25, rz: 0, scale: 1.15, cameraY: 1.4, cameraZ: 8.7, beans: 0, pour: 0, milk: 0, fill: 0, saucer: 0.3 },
  { at: 0.27, x: 1.4, y: 0, rx: 0, ry: -0.15, rz: 0, scale: 1.05, cameraY: 2.5, cameraZ: 8.5, beans: 1, pour: 0, milk: 0, fill: 0, saucer: 0.65 },
  { at: 0.43, x: -1.4, y: -0.15, rx: 0, ry: -0.3, rz: 0, scale: 1.3, cameraY: 5.8, cameraZ: 7.2, beans: 0, pour: 1, milk: 0, fill: 0.45, saucer: 0.4 },
  { at: 0.62, x: 1.3, y: -0.05, rx: 0, ry: -0.25, rz: 0, scale: 1.2, cameraY: 5.3, cameraZ: 8.2, beans: 0, pour: 0, milk: 1, fill: 1, saucer: 0.8 },
  { at: 0.83, x: -1.5, y: -0.2, rx: 0, ry: -0.15, rz: 0, scale: 1.05, cameraY: 4.6, cameraZ: 8.6, beans: 0, pour: 0, milk: 1, fill: 1, saucer: 1 },
  { at: 1, x: -1.5, y: -0.2, rx: 0, ry: -0.15, rz: 0, scale: 1.05, cameraY: 4.6, cameraZ: 8.6, beans: 0, pour: 0, milk: 1, fill: 1, saucer: 1 },
];

export function poseAt(progress: number, mobile: boolean): ScenePose {
  const p = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const index = Math.max(0, keys.findIndex((key, i) => i < keys.length - 1 && p <= keys[i + 1].at));
  const a = p === 1 ? keys[keys.length - 2] : keys[index];
  const b = p === 1 ? keys[keys.length - 1] : keys[index + 1];
  const t = Math.max(0, Math.min(1, (p - a.at) / (b.at - a.at)));
  const ease = t * t * (3 - 2 * t);
  const result = {} as ScenePose;
  for (const name of Object.keys(a) as (keyof ScenePose | 'at')[]) {
    if (name !== 'at') result[name] = a[name] + (b[name] - a[name]) * ease;
  }
  if (mobile) { result.x = 0; result.y = 0.75; result.scale *= 0.77; result.cameraZ += 1.1; }
  return result;
}
