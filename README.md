# BREOU CAFFEE
A continuous coffee story and local-only demo checkout, implemented in the user-designated repository.

## Run
Use Node 24 and the pinned package lock.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3100. On Windows PowerShell with script execution disabled, use `npm.cmd`.

## Verify
```sh
npm test
npm run typecheck
npm run lint
npm run fonts:check
npm run assets:check
npm run build
npm run test:e2e
```

Local browser checks use installed Google Chrome. CI installs the matching Playwright Chromium. To measure production, run `npm run start`, then `npm run budget:js` and `npm run audit:mobile` in another terminal. The mobile audit reports three cold-load runs and their median. Lab reports and visual captures go to ignored `art/qa`.

## Where to change things
- `DESIGN.md`: Everyday Ritual visual source; supersedes the historical dark palette.
- `src/styles/tokens.css`, `src/styles/ritual.css`: live tokens and responsive compositions.
- `src/config/catalog.ts`: placeholder USD names, integer cents, ingredients and pickup slots.
- `src/order/recipes.ts`: the three preset defaults and supported combinations.
- `src/order/store.ts`, `service.ts`: bounded cart, storage and replaceable demo submission.
- `src/motion/chapters.ts`, `src/scene/director.ts`: measured chapter alignment and pure camera/cup poses.
- `src/scene/CoffeeScene.tsx`: persistent procedural ceramic and preparation effects.
- `scripts/stills/capture.ts`: reproducible matched still/cutout capture against a running local server.

This demo sends no orders, payments or personal data. Only sanitized cart lines persist locally. Personal pickup details remain in memory/the open form and disappear with the session.

## Delivery status
See [verification](docs/verification.md) for measured results and limitations. Live 3D is currently enabled above 640px width and 600px height on capable devices; smaller/shorter viewports, reduced motion and unsupported WebGL use designed stills with full ordering. This conservative mobile policy is deliberate until physical-device performance is verified.

The shipped visual assets are procedural Three.js captures, not production Blender/Cycles renders. The outlined lettering is a reviewable identity study. Production assets and real Android/iPhone approval remain a separate handoff: [asset checklist](docs/assets/2026-11-06-breou-blender-asset-checklist.md).
