# 🧰 Box of Tools

[box-of-tools.com](https://box-of-tools.com) — a collection of small, fast, free utility
tools hosted on Cloudflare Pages, with a focus on speed and SEO. Most tools run entirely
in the browser; the Stock Calculator is the one exception (see below) since it needs live
historical price data no static site can provide on its own.

## Tools

- **[/password-generator](https://box-of-tools.com/password-generator)** — secure password
  & passphrase generator (Web Crypto API, nothing sent to a server)
- **[/tip-calculator](https://box-of-tools.com/tip-calculator)** — split the bill and
  calculate tip for any group size
- **[/stock-calculator](https://box-of-tools.com/stock-calculator)** — what a hypothetical
  investment would be worth today, with or without reinvested dividends. The only tool that
  talks to a server — see [Stock Calculator setup](#stock-calculator-setup) below.

More tools are added as separate routes; each tool is registered in
[`src/data/tools.ts`](src/data/tools.ts), which drives the homepage cards and nav.

## Tech stack

- [Astro](https://astro.build) — static site generation, zero JS by default
- [Svelte](https://svelte.dev) — interactive islands, only on pages that need them
- [Tailwind CSS](https://tailwindcss.com) — styling (v4, via the Vite plugin), with
  automatic light/dark scheme
- TypeScript
- [Cloudflare Pages](https://pages.cloudflare.com) for hosting/deployment

## Local development

```sh
npm install
npm run dev       # dev server with hot reload at http://localhost:4321
npm run build     # production build to dist/
npm run preview   # serve the production build locally
```

`npm run dev` is a plain Astro/Vite dev server — it does **not** serve the
[`functions/`](functions/) directory (Cloudflare Pages Functions, used only by the Stock
Calculator's `/api/stock-return`). Every other tool works fine under `npm run dev`. To test
the Stock Calculator's API route locally, build first and run it through Wrangler instead:

```sh
npm run build
npx wrangler pages dev dist --kv STOCK_CACHE
# then open the printed localhost URL and set TIINGO_API_KEY in .dev.vars (gitignored) first —
# see "Stock Calculator setup" below.
```

## Testing

Each tool's calculation logic lives in plain TypeScript modules under
[`src/lib/`](src/lib/) (e.g. `password.ts`, `tip.ts`), separate from the Svelte
components that render them, and is covered by unit tests with [Vitest](https://vitest.dev):

```sh
npm test         # run the test suite once
npm run test:watch   # re-run on file changes
```

## Deployment

Deploys via Cloudflare's Git integration — no GitHub Actions workflow involved. Every
push to `main` builds and deploys automatically; pull requests get preview URLs.

**One-time setup (Cloudflare dashboard):**

1. **Workers & Pages → Create → Pages → Connect to Git**, pick this repository.
2. Framework preset: **Astro** (auto-detected). Build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node version: picked up automatically from [`.node-version`](.node-version) (22)
3. Save and deploy. Cloudflare gives you a `*.pages.dev` URL immediately.
4. **Custom domain**: Pages project → **Custom domains** → add `box-of-tools.com` and
   follow the DNS instructions (trivial if the domain is already on Cloudflare DNS).

Build settings are also pinned as code in [`wrangler.toml`](wrangler.toml)
(`pages_build_output_dir`), so `npx wrangler pages deploy` works too if you ever want to
deploy manually from your machine instead of relying on the Git integration.

## Stock Calculator setup

Every other tool is pure client-side math. The Stock Calculator needs real historical stock
prices, which come from [Tiingo](https://www.tiingo.com)'s API via a Cloudflare Pages
Function ([`functions/api/stock-return.ts`](functions/api/stock-return.ts)) — a small
server-side proxy that keeps the API key private and caches each ticker's full price
history in a KV namespace (a closing price for a past date never changes, so once a ticker
is fetched it's effectively cached forever; only the last day or so needs refreshing).

This tool won't work until two things are set up in the Cloudflare dashboard — neither is
committed to the repo, since one is a secret and the other is an infrastructure resource
tied to your Cloudflare account:

1. **Get a Tiingo API key**: sign up at [tiingo.com](https://www.tiingo.com) (free tier is
   fine to start) and generate a token at
   [tiingo.com/account/api/token](https://www.tiingo.com/account/api/token).
2. **Create the KV namespace**: Cloudflare dashboard → **Workers & Pages → KV** → create a
   namespace (e.g. `box-of-tools-stock-cache`).
3. **Bind it to the Pages project**: Pages project → **Settings → Functions → KV namespace
   bindings** → add a binding named exactly `STOCK_CACHE` pointing at the namespace from
   step 2.
4. **Add the secret**: Pages project → **Settings → Environment variables** → add
   `TIINGO_API_KEY` as a **secret** (both Production and Preview environments) with the
   token from step 1.
5. Redeploy (or trigger a new deploy) so the Function picks up the binding and secret.

For local testing with `wrangler pages dev` (see above), create a `.dev.vars` file at the
repo root (already gitignored — never commit it) with:

```
TIINGO_API_KEY=your-token-here
```

`wrangler pages dev --kv STOCK_CACHE` creates a local, on-disk KV store automatically, so no
Cloudflare account access is needed just to test locally.
