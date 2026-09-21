# Deploying to gravityproperties.co.za

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
| `VITE_MSAL_TENANT_ID` | `385f3470-aae2-44d0-8cff-1da9ffd31951` |

The tenant ID is the gravitygh.co.za directory and is fixed — it is public
information, returned by Microsoft to anyone who asks:
`login.microsoftonline.com/gravitygh.co.za/v2.0/.well-known/openid-configuration`.

The client ID does not exist until someone creates the app registration in
Azure — see [AUTH_SETUP.md](AUTH_SETUP.md). There is no default value for it.

Variables, not secrets — both end up in the JavaScript bundle regardless, and
this repo is public. That's normal for a SPA and safe: they're identifiers,
not credentials. Access control is Microsoft enforcing the single-tenant app
registration at sign-in, not these values being hidden. See
[AUTH_SETUP.md](AUTH_SETUP.md).

## 3. DNS at domains.co.za

The domain is registered through **domains.co.za** (nameservers
`ns1`–`ns4.tld-ns.net`/`.com`). Log into the domains.co.za control panel →
DNS / zone editor for `gravityproperties.co.za`.

**Delete** the existing parking record — an `A` on `@` pointing at
`169.239.219.58` — and the `www` record beside it. Then add:

| type | host | value |
| --- | --- | --- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `gravdevelopment.github.io.` |

All four A records, not one — they're GitHub's Pages edge and the redundancy
is the point. An apex can't be a CNAME, which is why this isn't a single
record like a subdomain would be.

The `www` CNAME is what makes `www.gravityproperties.co.za` work; GitHub
redirects it to the bare domain automatically.

There are currently no `MX` records on this domain, so none of this affects
email. If mail is ever added here, leave the `MX` records alone — they're
independent of the `A` records above.

Give it up to an hour, then check:

```
nslookup gravityproperties.co.za 8.8.8.8
```

Once that returns the four `185.199.x` addresses, go back to **Settings →
Pages**, wait for the domain check to go green, and tick **Enforce HTTPS**.
The certificate is issued automatically.

If the certificate is still pending after an hour with DNS resolving
correctly, ask domains.co.za whether a `CAA` record exists on the domain. If
one does and it doesn't list `letsencrypt.org`, GitHub can't issue and that
entry needs adding.

## 4. Add the live URL to Azure

Sign-in will fail with `redirect_uri mismatch` until you do this.

[portal.azure.com](https://portal.azure.com) → **Microsoft Entra ID** → **App
registrations** → the GravProperty app → **Authentication** → under the
**Single-page application** platform → **Add URI**:

```
https://gravityproperties.co.za
```

No trailing slash. Keep `http://localhost:63734` in the list so local dev
still works.

Note this is a *different* domain from the Microsoft 365 tenant
(`gravitygh.co.za`). That's fine — the redirect URI is just where Microsoft
sends the browser back to, and has nothing to do with which accounts may sign
in. Access is still restricted to gravitygh.co.za accounts by the
single-tenant app registration.

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

- **Moving to a subdomain later?** Change [public/CNAME](public/CNAME) to the
  new name, swap the four apex `A` records for a single `CNAME` pointing at
  `gravdevelopment.github.io.`, and update the Azure redirect URI to match.
- **Want to test at `gravdevelopment.github.io/GravityProperty/` first?**
  Delete `public/CNAME` and set `base: '/GravityProperty/'` in
  `vite.config.js`, then add that URL as a redirect URI too. Reverse both when
  you move to the real domain.
