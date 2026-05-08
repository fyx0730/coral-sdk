# coral-sdk

Browser bundle for [node-coral](https://github.com/nathankellenicki/node-coral) (LEGO Coral / Web Bluetooth). Exposes `globalThis.Coral`, `SingleMotorDevice`, `DoubleMotorDevice`, `MotorDirection`, and `MotorPort`.

## Hosted script (after GitHub Pages is enabled)

`https://fyx0730.github.io/coral-sdk/coral.js`

Use that URL in Snap or any page:

```html
<script src="https://fyx0730.github.io/coral-sdk/coral.js"></script>
```

## Enable GitHub Pages

1. Open **Settings → Pages** on this repo.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main` (or merge) so [Deploy to GitHub Pages](.github/workflows/deploy-pages.yml) runs. When it succeeds, the URL above serves `coral.js` over HTTPS (required for Web Bluetooth).

## Local build

```bash
npm ci
npm run build
```

Output: `dist/coral.js`. Serve the repo root (e.g. `npx serve`) and open `index.html` or `test.html`.
