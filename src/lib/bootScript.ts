/**
 * Pre-paint boot script. A STATIC string: no runtime value is ever
 * interpolated into it. It touches no storage, makes no network request and
 * uses no eval. It must stay in sync with `initialTier` in `tier.ts`
 * (a unit test asserts agreement across a table of environments).
 *
 * - Adds `js` to <html> immediately.
 * - Probes the environment inside try/catch; any failure yields tier "low".
 * - Sets `data-tier` and adds `has-motion` unless the tier is low.
 */
export const BOOT_SCRIPT =
  '(function(){' +
  'var d=document.documentElement,t="low";' +
  'd.classList.add("js");' +
  'try{' +
  'var m=function(q){return matchMedia(q).matches},' +
  'n=navigator,c=n.connection,dm=n.deviceMemory,hc=n.hardwareConcurrency,' +
  'k=document.createElement("canvas"),' +
  'gl=!!(k.getContext("webgl2")||k.getContext("webgl")),' +
  'low=m("(prefers-reduced-motion: reduce)")||!gl||' +
  '(typeof dm==="number"&&dm<=2)||!!(c&&c.saveData)||' +
  '(typeof hc==="number"&&hc<=2);' +
  'if(!low)t=m("(pointer: coarse)")?"medium":"high"' +
  '}catch(e){t="low"}' +
  'd.dataset.tier=t;' +
  'if(t!=="low")d.classList.add("has-motion")' +
  '})();';
