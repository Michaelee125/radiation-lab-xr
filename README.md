# Radiation Lab XR

Radiation Lab XR is a compact, offline-first A-Frame/WebXR teaching simulation for a 15-minute A-level or IGCSE demonstration. It models alpha, beta-minus and gamma radiation travelling from a source, through a removable shield, to a GM tube. It works in Meta Quest Browser with controller rays and in a desktop browser with a mouse.

The simulation is deliberately schematic. Particle size, separation, paths and visible speeds are not to scale, and the transmission factors are simplified classroom values rather than universal material constants.

## Quick start

The checked-in `vendor/aframe.min.js`, local font and icons are sufficient at runtime. Node.js 20 or newer is needed only for the included development server and tests.

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:4173`. Localhost is a secure-context exception for service workers and desktop development. WebXR on a Quest must be served through HTTPS.

If you use pnpm instead:

```sh
pnpm install --config.blockExoticSubdeps=false
pnpm dev
```

Do not open `index.html` directly from the filesystem; modules and the service worker require an HTTP(S) server.

## Classroom operation

1. Open the app and wait for **Offline ready**.
2. Click any experiment control once to let the browser initialise sound, or select **Enable sound**.
3. Select Alpha, Beta and Gamma independently. The app prevents all three from being switched off.
4. Drag paper, aluminium or lead from the rack into the centre holder. In VR, point at a material, hold the trigger, point at the holder, and release.
5. Use **Show particle paths** to hide only the trails. Particle motion and the count model continue unchanged.
6. Read the most recent one-second count, cps, eight-second rolling average, active shield and selected sources beside the GM tube.
7. Use **No shield** to return the active shield to the rack, or **Reset** to restore Alpha-only, no shield, paths on and sound on. Resetting the experiment does not clear the offline-ready installation status.

The GM tube reports a total count. It does not identify which radiation type caused an event.

## Physics and configuration

All editable teaching values live in [`js/config.js`](js/config.js):

- shield transmission factors;
- alpha, beta and gamma unshielded base count rates;
- background count rate;
- rolling-average duration and maximum audible click rate;
- particle colours, lanes, speeds, emission intervals and pool sizes;
- apparatus positions and shield snap distance.

`js/physics-model.js` is the only module that interprets those factors. Particle transmission, live explanations and expected GM count rates all call the same functions. Visual transmission is sampled at the shield; the numerical GM reading uses the same transmission probability as an expected rate.

The simplified model enforces these teaching outcomes:

- paper stops alpha;
- beta mostly passes paper and is strongly reduced by aluminium;
- gamma mostly passes paper and aluminium;
- lead substantially attenuates gamma but never reduces it to zero;
- background counts remain even when the selected source is fully blocked.

The counter samples a Poisson-style stochastic process once per second. Numerical counts are never capped. Locally generated Web Audio clicks are capped at 18 per second to avoid an overwhelming or distorted sound.

## Architecture

- `index.html` contains one procedural A-Frame laboratory scene with no locomotion.
- `js/state.js` owns the single application state and its invariants.
- `js/radiation-emitter.js` defines reusable alpha, beta and gamma A-Frame models, distinct trails and fixed-size object pools.
- `js/shield-interaction.js` handles mouse/controller ray grabbing, release, snap, replacement and safe rack return without a physics engine.
- `js/gm-counter.js` handles stochastic counts, the rolling average and synthesised clicks.
- `js/ui-controller.js` renders every control, detector line and explanation from shared state.
- `js/quest-controls.js` provides controller connection feedback; A-Frame laser controls supply both controller rays.
- `service-worker.js` precaches the complete runtime app shell.

Simulation work is capped, pooled and skipped while the page is hidden. The scene uses simple geometry, flat panels, no shadows, no post-processing and no large models.

## Tests and checks

```sh
npm test
npm run check
```

`npm test` covers the shielding rules, background, additive sources, all seven non-empty source combinations, all-off prevention, reset, shield changes, path/count independence, single active shield state and deterministic seeded randomness.

`npm run check` additionally confirms that every required local runtime asset exists, the A-Frame bundle is local and complete, authored runtime files contain no CDN dependency, and the offline app shell includes every runtime file.

For a desktop smoke test, open the local URL, watch the count change, toggle every source, drag each shield, toggle paths, test sound and reset. Browser developer tools should show no blocking errors and no external network request.

## HTTPS deployment for Quest

This is a static site: deploy the repository root without a build step to any HTTPS static host. Examples include Cloudflare Pages, Netlify, GitHub Pages or a school web server. Configure the host to publish the repository root, then open the HTTPS URL in Meta Quest Browser.

For a private school network, serve the same files from an HTTPS server whose certificate is trusted by the headset. A self-signed certificate that the Quest does not trust is not sufficient for WebXR. The app makes no runtime API calls and sends no experiment data anywhere.

After any release, increment `CACHE_VERSION` in `service-worker.js`. The new worker precaches the complete new shell, removes old named caches, activates immediately and takes control. Existing open lessons are not forcibly reloaded; reopen the app after class to use a newly cached update.

## Install and verify offline use on Quest

1. Connect the Quest to Wi-Fi and open the deployed **HTTPS** URL in Meta Quest Browser.
2. Keep the page open until both the desktop badge and the in-world panel say **Offline ready**.
3. Use the browser menu to install the PWA or add it to the Quest app/home surface when that option is available. If the browser version exposes no install action, bookmark the URL; the service-worker cache still supports an offline revisit.
4. Enter VR once and interact with a control so WebXR and audio permissions have been exercised.
5. Exit VR, close the browser tab, turn Wi-Fi off, then reopen the installed app or bookmarked URL.
6. Confirm the laboratory loads, the GM reading updates and all controls work. The address must be exactly within the originally cached app scope.
7. Turn Wi-Fi back on after the check so future cache-version updates can be downloaded.

Do the first cache/install before the lesson. Browser storage can be cleared by system maintenance or user action, so repeat the offline launch check after a Quest Browser or operating-system update.

## Exact manual Quest acceptance procedure

The printable checklist is in [`tests/MANUAL_QUEST_CHECKLIST.md`](tests/MANUAL_QUEST_CHECKLIST.md). It covers immersive entry, both controllers, every material, every source combination, paths, sound, counts, reset, offline launch, comfort and reach.

## Known verification boundary

Automated and desktop-browser checks can verify the physics, state, local assets, service worker, scene startup and mouse controls. Controller ergonomics, text readability inside a headset, Quest 2/3 frame rate, physical reach comfort, trigger event mapping and the final offline installed launch require a physical Meta Quest headset and must be signed off with the manual checklist.
