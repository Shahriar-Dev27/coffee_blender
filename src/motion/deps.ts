/** Type-only aliases for the dynamically imported motion libraries. Never import these packages at runtime here. */
export type Gsap = typeof import('gsap').gsap;
export type ScrollTriggerStatic = typeof import('gsap/ScrollTrigger').ScrollTrigger;
export type LenisConstructor = typeof import('lenis').default;
export type GsapTimeline = ReturnType<Gsap['timeline']>;
