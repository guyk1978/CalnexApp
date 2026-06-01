# Tools (App Router)

Take-home pay is **not** a Next.js route. It is generated as static HTML:

- Source generator: `scripts/generate-take-home-pay-page.mjs`
- Output: `tools/take-home-pay/index.html`
- Calculator scripts: `assets/js/take-home-pay-engine.js`, `assets/js/take-home-pay-calculator.js`

Regenerate after content or layout changes:

```bash
npm run generate:take-home-pay
```
