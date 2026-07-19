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

- **Infrastructure**: provisioned with Terraform — see [`infra/README.md`](infra/README.md)
  for `init`/`plan`/`apply` instructions and how the deployment token is wired into
  GitHub Actions.
- **CI/CD**: pushes to `main` build and deploy via
  [`.github/workflows/azure-static-web-apps.yml`](.github/workflows/azure-static-web-apps.yml);
  pull requests get preview environments. Requires the `AZURE_STATIC_WEB_APPS_API_TOKEN`
  repository secret (from the Terraform output).
- **TODO**: custom domain setup (box-of-tools.com DNS + SWA custom domain), Google AdSense
  integration.
