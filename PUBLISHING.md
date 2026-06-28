# Publishing Chituma to npm

This makes `npm create chituma@latest` work for everyone. `npm create <name>`
runs the package literally named **`create-chituma`**, which in turn scaffolds a
project that depends on **`chituma`** and **`@chituma/*`** — so all of them must
be published to the public npm registry.

## Name availability (checked 2026-06-28)

| Name | Status |
| --- | --- |
| `chituma` | available (404) |
| `create-chituma` | available (404) |
| `@chituma` scope | available (no such org/user yet) |

If any name gets taken before you publish, rename it (e.g. `chituma-ai` /
`create-chituma-app`) and update references.

## One-time setup

1. Create an account on https://npmjs.com and enable 2FA.
2. Create an organization named **chituma** (free, public) so the `@chituma/*`
   scope resolves: https://www.npmjs.com/org/create
3. Create the GitHub repo and update the `repository`/`homepage`/`bugs` URLs in
   each `package.json` if you don't use `github.com/chituma-ai/chituma`.
4. Log in locally:
   ```bash
   npm login
   ```

Scoped packages are configured to publish publicly via `.changeset/config.json`
(`"access": "public"`).

## Release flow (from the repo root)

```bash
pnpm install
pnpm build                 # REQUIRED: only dist/ is published (see each pkg's "files")
pnpm test                  # sanity check — 121 tests should pass

pnpm changeset version     # consume .changeset/*.md → bump versions + CHANGELOG
git add -A && git commit -m "release: version packages"

pnpm changeset publish     # rewrites workspace:* → real versions, publishes in
                           # dependency order, and creates git tags
git push --follow-tags
```

> `apps/*` and `examples/*` are excluded from release via `.changeset/config.json`.

## Verify (anywhere, by anyone)

```bash
npm create chituma@latest my-app
cd my-app
npm install
cp .env.example .env       # add ANTHROPIC_API_KEY
npm run dev
```

## Shipping updates later

```bash
pnpm changeset             # describe the change, pick semver bump
pnpm changeset version
pnpm changeset publish
```

Users get the new release automatically on their next `npm create chituma@latest`
because the template pins the Chituma packages to `latest`.

## Dry run / private testing

- `npm publish --dry-run` in a package shows exactly what would be uploaded.
- For a full end-to-end rehearsal without touching the public registry, run a
  local registry such as [Verdaccio](https://verdaccio.org/):
  ```bash
  npx verdaccio &                       # starts at http://localhost:4873
  npm set registry http://localhost:4873
  npm adduser --registry http://localhost:4873
  pnpm -r publish --registry http://localhost:4873 --no-git-checks
  npm create chituma@latest my-app --registry http://localhost:4873
  npm set registry https://registry.npmjs.org   # restore when done
  ```
