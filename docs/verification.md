# BREOU implementation verification

Verified November 6, 2026, in the project checkout on Windows, Node 24 and installed Google Chrome. The production server is available at http://127.0.0.1:3100 while its local process remains running.

## Delivered behavior

Everyday Ritual cream/red compositions, local licensed fonts and an outlined BREOU CAFFEE lettering study surround one persistent procedural Three.js cup. Measured native-scroll chapter offsets feed one progress channel and a pure scene director. The cup, beans, espresso/milk treatment, size fill and sweetener cue respond to the order selection. Demand rendering stops continuous activity in hidden tabs and while checkout is open.

Three compatible presets lead into ingredient/size choices, integer-cent pricing, bounded quantities, merged cart lines, guarded persistence and native-dialog demo checkout. Inline validation, keyboard focus containment/restoration, pending submission protection, a local receipt and new-order reset are implemented. Pickup data is not transmitted or persisted.

## Executed checks

| Check | Result |
| --- | --- |
| Vitest | 269 passed across 13 files |
| TypeScript | Passed |
| ESLint | Passed |
| Next.js production build | Passed; home page prerendered statically |
| Playwright production journeys | 38 passed; 4 intentional skips |
| axe in checkout, validation and receipt states | No violations in tested states |
| Asset gate | Passed: required posters, runtime cutouts, responsive hero variants and share image; naming, dimensions, budgets and flat-background checks |
| Font/retained OFL gate | Passed |
| Git diff whitespace check | Passed |
| CI YAML and Lighthouse configuration syntax | Parsed successfully; remote GitHub Actions execution not performed |

The four skips are the two live-WebGL tests in each of the mobile/static and explicitly no-WebGL projects. Those projects execute the full ordering and fallback checks instead. Browser coverage includes keyboard-only checkout, required-field focus, quantity bounds, refresh persistence, blocked storage, reduced motion, 320px reflow, rapid toggling, maximum configured pricing, reverse scroll/resize retention, close/reopen during submission, real context loss, current-pose preservation while opening checkout, and an 80-character unbroken receipt name.

## Production loading measurements

Lighthouse used mobile 390x844 emulation with its standard mobile simulation, on three cold-load runs of the production server. These are lab measurements, not field percentiles or physical-device results.

| Metric | Measured median | Target |
| --- | --- | --- |
| Performance score | 98/100 | Informational |
| Accessibility score | 100/100 | Informational; automated coverage only |
| LCP | 2,437.88 ms | <=2,500 ms |
| CLS | 0 | <=0.1 |
| TBT | 26 ms | Informational; not a substitute for INP |
| FCP | 757.62 ms | Informational |
| Initial modern-browser JS | 145,220 bytes gzip (141.82 KiB) | <=150 KiB |

LCP runs were 2,446.91, 2,437.88 and 2,437.44 ms. JavaScript measurement includes initial HTML script resources and excludes the `noModule` compatibility script that modern browsers do not request. Three.js and motion imports are deferred; static mobile layouts do not load the motion driver or probe WebGL.

Run `npm run budget:js` and `npm run audit:mobile` against `npm run start` to reproduce. The audit checks the median against the strict LCP/CLS targets and fails when they are exceeded. Raw local reports are in ignored `art/qa/lighthouse-1.html`, `lighthouse-2.html`, `lighthouse-3.html`, `lighthouse.json` and `js-budget.json`. A fresh deployment and its network conditions must be measured again; the LCP headroom is modest.

## Review and visual checks

An independent read-only review found no Critical issues and two Important issues: cart opening cut the camera to the final pose, and an accepted unbroken pickup name overflowed a narrow receipt. Both were reproduced as browser regressions and fixed. An outstanding scene-enable timeout is also cancelled when media eligibility changes.

Hero, counter, open dialog and mobile compositions were rendered and inspected. The hero asset is selected for its actual displayed width; the local SVG wordmark is embedded at build time with accessible text and no duplicate SVG IDs.

## Explicit external gates

- Shipped geometry/captures are procedural implementation assets, not Blender/Cycles production renders. All stage asset records remain marked as placeholders. See the updated production checklist.
- Width <=640px or height <=600px currently uses intentional still compositions with full ordering. Enabling live mobile 3D awaits physical-device results.
- The lettering/silhouette still needs the separate optical brand review requested by DESIGN.md.
- Physical mid-range Android/iPhone testing and actual browser 200% zoom were not performed. Narrow/reflow browser checks are not presented as those manual checks.
- Field INP and real-device frame-time compliance are not established by the Lighthouse TBT result.
- Catalog names, USD prices, pickup slots and copy remain editable demo data. No payment, email, backend order transmission, hosting deployment or publication was performed.

The implementation is reviewable locally. These external production acceptance gates remain separate from the verified demo code and asset handoff.
