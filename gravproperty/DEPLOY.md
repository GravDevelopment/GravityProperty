# Deploying to property.gravitygh.co.za

Hosting is **GitHub Pages**, built by GitHub Actions on every push to `main`
([.github/workflows/deploy.yml](../.github/workflows/deploy.yml)). Nothing to
upload by hand.

Do steps 1–4 once. After that, pushing to `main` deploys.

## 1. Turn on Pages

Repo → **Settings** → **Pages** → **Source: GitHub Actions**.

(Leave the "Custom domain" box alone — [public/CNAME](public/CNAME) sets it
from the build, which is the version that survives redeploys.)

## 2. Add the two build variables

Repo → **Settings** → **Secrets and variables** → **Actions** → **Variables**
tab → **New repository variable**:

| name | value |
| --- | --- |
| `VITE_MSAL_CLIENT_ID` | Application (client) ID from the Azure app registration |
| `VITE_MSAL_TENANT_ID` | Directory (tenant) ID |

Variables, not secrets — both end up in the JavaScript bundle regardless, and
this repo is public. That's normal for a SPA and safe: they're identifiers,
not credentials. Access control is Microsoft enforcing the single-tenant app
registration at sign-in, not these values being hidden. See
[AUTH_SETUP.md](AUTH_SETUP.md).

## 3. DNS at Alesco

`gravitygh.co.za` is served by `ns1/ns2/ns3.alesco.co.za`, so add this in the
Alesco control panel (or ask them to):

| type | host | value |
| --- | --- | --- |
| CNAME | `property` | `gravdevelopment.github.io.` |

Only the `property` subdomain — the apex `gravitygh.co.za` keeps pointing at
`41.204.209.246` and is untouched.

Give it up to an hour, then back in **Settings → Pages** wait for the domain
check to go green and tick **Enforce HTTPS**. The certificate is issued
automatically once DNS resolves.

## 4. Add the live URL to Azure

Sign-in will fail with `redirect_uri mismatch` until you do this.

[portal.azure.com](https://portal.azure.com) → **Microsoft Entra ID** → **App
registrations** → the GravProperty app → **Authentication** → under the
**Single-page application** platform → **Add URI**:

```
https://property.gravitygh.co.za
```

No trailing slash. Keep `http://localhost:63734` in the list so local dev
still works.

## Deploying

Push to `main`. The workflow runs `npm ci`, `npm test`, `npm run build`, then
publishes `gravproperty/dist`. A failing test blocks the deploy on purpose.
Watch it under the repo's **Actions** tab; **Run workflow** on the "Deploy to
GitHub Pages" workflow re-deploys without a code change.

## Before the whole desk uses this

**Every person's data is private to their own browser.** Unit records live in
`localStorage`, uploaded documents in IndexedDB, on that machine only. Putting
the app on a domain does not change this — two agents on two laptops get two
separate, empty pipelines, and nobody can see anyone else's work.

So right now this is fine for one person, or as a demo. Shared data needs a
backend: `src/pipeline.js` already keeps all the logic pure with `load()` and
`save()` as the only storage touchpoints, and `src/files.js` is the only place
blobs are handled, so the swap is contained — but it is real work, and it also
raises questions this app doesn't currently answer (who may see which units,
where tenant ID documents are legally allowed to be stored, backups). Worth
scoping properly rather than bolting on.

## Other notes

- **Different subdomain?** Change [public/CNAME](public/CNAME), the DNS record
  in step 3, and the Azure redirect URI in step 4 to match.
- **Want to test at `gravdevelopment.github.io/GravityProperty/` first?**
  Delete `public/CNAME` and set `base: '/GravityProperty/'` in
  `vite.config.js`, then add that URL as a redirect URI too. Reverse both when
  you move to the real domain.
