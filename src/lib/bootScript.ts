/**
 * Pre-paint boot script. A STATIC string: no runtime value is ever
 * interpolated into it. It touches no storage, makes no network request and
 * uses no eval. It must stay in sync with `initialTier` in `tier.ts`
 * (a unit test asserts agreement across a table of environments).
 *
 * - Adds `js` to <html> immediately.
 * - Probes the environment inside try/catch; any failure yields tier "low".
 * - The WebGL probe is the last operand of the low-tier test so it
 *   short-circuits (no context is created on reduced-motion or low-end
 *   devices), and a successful probe context is released immediately.
 * - Sets `data-tier` and adds `has-motion` unless the tier is low.
 *
 * SECURITY: this string is injected with dangerouslySetInnerHTML, so it must
 * be built ONLY from string literals joined with `+`. No variables, no
 * template literals, no interpolation of any kind.
 */
export const BOOT_SCRIPT =
  '(function(){' +
  'var d=document.documentElement,t="low";' +
  'd.classList.add("js");' +
  'try{' +
  'var m=function(q){return matchMedia(q).matches},' +
  'n=navigator,c=n.connection,dm=n.deviceMemory,hc=n.hardwareConcurrency,' +
  'k=document.createElement("canvas"),g=null,' +
  'low=m("(prefers-reduced-motion: reduce)")||' +
  '(typeof dm==="number"&&dm<=2)||!!(c&&c.saveData)||' +
  '(typeof hc==="number"&&hc<=2)||' +
  '!(g=k.getContext("webgl2")||k.getContext("webgl"));' +
  'if(g){try{var x=g.getExtension("WEBGL_lose_context");if(x)x.loseContext()}catch(e){}}' +
  'if(!low)t=m("(pointer: coarse)")?"medium":"high"' +
  '}catch(e){t="low"}' +
  'd.dataset.tier=t;' +
  'if(t!=="low")d.classList.add("has-motion")' +
  '})();';
