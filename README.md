# Motionbench

Compare spring and cubic Bézier motion on a side panel, tab indicator, or toast. Keep one result as a reference, change the parameters, and replay both before exporting the timing as CSS or JavaScript.

![Motionbench workbench](docs/screenshot.png)

**[Open the workbench](https://miiduoa.github.io/motionbench/)** · **[設計與工程筆記](docs/design.zh-TW.md)**

## Try it in a minute

The interface starts in Traditional Chinese; use **English** in the header to switch.

1. Choose a preview component, then select **Buoyant** and raise **Damping**. The same sample component replays when you change a parameter.
2. Choose **Keep as reference**, then switch to **Bézier** and change its duration. Both previews start together but finish at their own times. The graph below overlays their shapes at normalized time.
3. Select **CSS** or **JavaScript** and open **View code**. Copy or download the result. CSS animates an element with `class="motion"`; JavaScript exports `playMotion(element, distance)` and returns its native `Animation`. The export contains translation timing, not the sample component layout.

## What it does

- Analytic spring response across underdamped, critically damped, and overdamped systems; adjustable stiffness, damping, and mass.
- Cubic Bézier timing with adjustable control points and duration, including anticipation and overshoot.
- Side-by-side component previews with a shared playback clock and independent durations; replay, looping, and four presets per model.
- A response graph below the previews for checking overshoot, settling, and normalized curve shapes.
- Spring CSS uses `linear()` with 181 samples. Bézier CSS uses exact `cubic-bezier()`. JavaScript uses sampled Web Animations keyframes.
- Keyboard-accessible controls, editable numeric values with range validation, a reduced-motion mode, and English / Traditional Chinese UI.
- Local processing, no accounts, analytics, external fonts, or runtime network calls.

## Run

Node.js 24 or later; npm.

```sh
npm ci
npm run dev
npm run check
npm run build
```

`npm run check` runs TypeScript and the numerical/export test suite. `npm run preview` serves the production build. GitHub Pages deployment is configured in `.github/workflows/pages.yml`; the repository must have Pages configured to use GitHub Actions. The workflow deploys under `/motionbench/`.

## Model and boundaries

`src/motion.ts` is the independent numerical/export layer. `src/playback.ts` maps elapsed milliseconds to each curve and interpolates its samples. `src/App.tsx` owns controls, component previews, playback, and file/clipboard interactions. `src/styles.css` provides the responsive layout without a component framework.

Springs start at position `0` with zero velocity and target position `1`. Settling means position error below `0.001` and estimated speed below `0.01` for 200 ms, sampled at 120 Hz. Duration is capped at 12 seconds and the last exported sample is fixed to `1`; a capped curve is labeled in the UI. Spring curves and JavaScript exports are piecewise-linear approximations, not continuous physics engines. Overshoot is measured from those samples.

Pinned previews use the same elapsed clock and keep their individual durations; a shorter curve holds its endpoint while the longer one continues. The graph separately aligns normalized time for shape comparison. The sample components show translation only; they do not simulate coupled objects, interruptions, or a complete component interaction. Reduced-motion preference holds both previews at their endpoints and disables replay and looping. Exported transforms replace the element's existing transform; use a wrapper if it already has rotation or scaling. CSS `linear()` needs a supporting browser; the JavaScript export is an alternative using the Web Animations API. Clipboard access depends on browser permissions and a secure context; downloading is available separately.

The tests cover all damping regimes, continuity around critical damping, numeric stability, increasing sample times, endpoint correctness, invalid inputs, duration caps, Bézier inversion, executable JavaScript/CSS export contracts, independent playback durations, and endpoint holding without clipping spring overshoot. Browser and assistive-technology coverage is separate from those unit tests.

## License

[MIT](LICENSE) © 2026 Miiduoa.
