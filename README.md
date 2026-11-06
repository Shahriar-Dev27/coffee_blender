<p align="center">
  <img src="public/brand/breou-lockup.svg" width="250" alt="BREOU CAFFEE" />
</p>

# BREOU CAFFEE

Coffee. A little more personal.

A cinematic coffee storefront that turns the journey from empty cup to everyday ritual into a scroll-driven story. Customize a drink, build a cart, and try a complete local-only pickup checkout.

![Procedural coffee cup preview for BREOU CAFFEE](public/assets/share-final-1200x630.webp)

[Experience](#the-experience) · [Get started](#get-started) · [Quality checks](#quality-checks) · [Project map](#project-map) · [Production boundaries](#production-boundaries)

> [!IMPORTANT]
> This is a frontend demonstration, not a live café ordering service. No orders, payments, emails, or pickup details are transmitted. Catalog names, USD prices, and pickup slots are placeholder data.

## The experience

- One continuous coffee story: a persistent procedural 3D cup moves through the editorial chapters, from arrival and beans to the pour, milk, and final drink.
- A cup that responds: size, blend, roast, milk, and sweetener choices feed the ordering model and scene treatment. Start with Espresso, Flat white, or Oat latte.
- A complete demo checkout: compatible recipes, integer-cent pricing, bounded quantities, merged cart lines, pickup validation, a pending state, and a local receipt.
- Motion as an enhancement: desktop scroll choreography and wheel smoothing load on eligible devices. Reduced motion, smaller viewports, and unsupported WebGL use designed stills instead, without removing ordering.
- Accessible interaction: skip navigation, labeled controls, keyboard-operated checkout, focus containment/restoration, and inline validation.
- Local-first cart: sanitized selections and quantities survive refresh when browser storage is available; pickup details remain in memory only.

## Built with

| Layer | Tools |
| --- | --- |
| Application | Next.js App Router, React, TypeScript |
| Scene | Three.js, React Three Fiber, Drei |
| Motion | GSAP, ScrollTrigger, Lenis |
| State | Zustand with guarded browser storage |
| Visual system | CSS tokens, responsive layouts, locally hosted fonts, AVIF/WebP assets |
| Quality | Vitest, Testing Library, Playwright, axe, ESLint, Lighthouse |

## Get started

Use Node.js 24 and npm. Install the locked dependencies rather than regenerating the lockfile.

```sh
git clone https://github.com/Shahriar-Dev27/coffee_blender.git
cd coffee_blender
npm ci
npm run dev
```

Open http://127.0.0.1:3100. No API keys, database, or environment file are needed for the demo.

On Windows PowerShell with script execution disabled, use `npm.cmd` in place of `npm`.

### Production preview

```sh
npm run build
npm run start
```

The production server also uses http://127.0.0.1:3100. Stop the development server before starting production on the same port.

## Quality checks

### Unit, static, and asset checks

```sh
npm test
npm run typecheck
npm run lint
npm run fonts:check
npm run assets:check
```

### Browser journeys

```sh
npm run test:e2e
```

Local Playwright runs use installed Google Chrome. CI sets `CI` and installs Playwright Chromium with `npx playwright install --with-deps chromium`.

The runner covers desktop, Pixel 7 emulation, and a no-WebGL configuration. It builds and starts the production app when no existing server is reused. Stop any development server first if you want a production-only run. Coverage includes cart persistence, checkout validation, keyboard interaction, reduced motion, responsive fallback, and scene behavior.

### Loading budgets

With the production server running, open a second terminal:

```sh
npm run budget:js
npm run audit:mobile
```

The JavaScript gate caps initial modern-browser scripts at 150 KiB gzip. The mobile Lighthouse audit runs three cold loads and checks median LCP at or below 2,500 ms and CLS at or below 0.1. These are lab budgets, not proof of physical-device performance or field INP. Local reports are written to ignored `art/qa/`.

See [the verification report](docs/verification.md) for recorded results, their date, and unverified acceptance gates. Its measurements describe that recorded run, not a guarantee for every commit or deployment. The [quality workflow](.github/workflows/quality.yml) defines the automated CI checks.

## Project map

| Change | Start here |
| --- | --- |
| Page chapters and editorial copy | `src/app/page.tsx` |
| Visual direction | [DESIGN.md](DESIGN.md) — the Everyday Ritual source of truth |
| Colors, typography, responsive composition | `src/styles/tokens.css`, `src/styles/ritual.css` |
| Drink options, USD pricing, pickup slots | `src/config/catalog.ts` |
| Presets and compatible combinations | `src/order/recipes.ts` |
| Cart state, storage, demo submission | `src/order/store.ts`, `src/order/storage.ts`, `src/order/service.ts` |
| Scroll progress and chapter alignment | `src/motion/chapters.ts`, `src/motion/story.ts` |
| Smooth-scroll feature switch | `src/config/flags.ts` |
| Camera/cup poses and preparation effects | `src/scene/director.ts`, `src/scene/CoffeeScene.tsx` |
| Device eligibility and quality tiers | `src/lib/tier.ts`, `src/motion/gate.ts` |
| Matched procedural still/cutout capture | `scripts/stills/capture.ts` |
| Unit and browser regression coverage | `tests/unit/`, `tests/e2e/` |

## Production boundaries

- Rendering: live 3D is eligible above 640px width and 600px height on capable devices. Smaller/shorter viewports, reduced motion, and unsupported WebGL use still compositions. Physical Android/iPhone approval is still required before expanding live mobile 3D.
- Assets: the shipped previews and stage images are procedural Three.js captures, not final Blender/Cycles renders. The outlined lettering is an identity study awaiting optical brand review.
- Data: only sanitized cart lines persist in browser storage. Prices are recalculated; pickup details are not persisted. Closing or refreshing the session loses the local pickup/receipt state.
- Commerce: there is no backend order transmission, payment integration, or email delivery. A production service needs server-side validation, authoritative pricing, and appropriate personal-data handling; `src/order/service.ts` is the current demo boundary.

The [production asset checklist](docs/assets/2026-11-06-breou-blender-asset-checklist.md) tracks the separate asset and real-device handoff.
