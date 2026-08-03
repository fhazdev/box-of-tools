# 🧰 Box of Tools

[box-of-tools.com](https://box-of-tools.com) — a collection of small, fast, free utility
tools that run entirely in the browser. Built as a learning project for Azure Static Web
Apps, with a focus on speed and SEO.

## Tools

- **[/password-generator](https://box-of-tools.com/password-generator)** — secure password
  & passphrase generator (Web Crypto API, nothing sent to a server)

More tools are added as separate routes; each tool is registered in
[`src/data/tools.ts`](src/data/tools.ts), which drives the homepage cards and nav.

## Tech stack

- [Astro](https://astro.build) — static site generation, zero JS by default
- [Svelte](https://svelte.dev) — interactive islands, only on pages that need them
- [Tailwind CSS](https://tailwindcss.com) — styling (v4, via the Vite plugin), with
  automatic light/dark scheme
- TypeScript
- Azure Static Web Apps (Free tier) + GitHub Actions for hosting/deployment
- Terraform for infrastructure (see [`infra/`](infra/))

## Local development

```sh
npm install
npm run dev       # dev server with hot reload at http://localhost:4321
npm run build     # production build to dist/
npm run preview   # serve the production build locally
```

## Testing with Docker (Azure SWA emulation)

`npm run dev` is the day-to-day workflow. To test the **production build** behind the
Azure Static Web Apps emulator (routing, `staticwebapp.config.json` handling) before
deploying:

```sh
docker compose up          # builds the site, serves it at http://localhost:4280
docker compose up --build  # only needed when dependencies change
```

The source tree is volume-mounted and the site is rebuilt on each container start, so
re-running `docker compose up` picks up source changes without an image rebuild.

## Deployment

### Cloudflare Pages (current)

Deploys via Cloudflare's Git integration — no GitHub Actions workflow needed for this
path. Every push builds and deploys automatically; pull requests get preview URLs.

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

### Azure Static Web Apps (alternate / learning reference)

Kept in the repo as a second, independent hosting path — see
[`infra/README.md`](infra/README.md) for the Terraform (`init`/`plan`/`apply`) and how its
deployment token feeds the `AZURE_STATIC_WEB_APPS_API_TOKEN` GitHub secret used by
[`.github/workflows/azure-static-web-apps.yml`](.github/workflows/azure-static-web-apps.yml).
The Docker/SWA-CLI setup above emulates this path locally.

### TODO

- Google AdSense integration.
