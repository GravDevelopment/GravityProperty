# GravProperty

Tenant onboarding pipeline for the letting desk. Tracks each unit through the
14 steps from "advertise" to "30-day follow-up", with document attachments,
progress notes, and a CSV export.

React + Vite. Sign-in is Microsoft Entra ID, locked to the gravitygh.co.za
tenant — see [AUTH_SETUP.md](AUTH_SETUP.md).

## Running it

```
npm install
cp .env.example .env.local   # fill in the two Azure IDs
npm run dev                  # http://localhost:63734
```

| command | does |
| --- | --- |
| `npm run dev` | dev server on port 63734 |
| `npm run build` | production build into `dist/` |
| `npm run preview` | serve the built `dist/` locally |
| `npm test` | pipeline logic tests (`node --test`) |
| `npm run lint` | oxlint |

## How it's put together

| file | what's in it |
| --- | --- |
| `src/pipeline.js` | all the pipeline logic — steps, phases, progress, CSV. Pure, no React. |
| `src/pipeline.test.mjs` | tests for the above |
| `src/App.jsx` | the whole UI |
| `src/auth.js` | MSAL redirect sign-in |
| `src/files.js` | uploaded document blobs, in IndexedDB |

## Where the data lives

**Per browser, on the signed-in person's own machine.** Unit records go in
`localStorage`; uploaded documents go in IndexedDB. Nothing is sent to a
server.

That means two agents on two laptops each see their own separate pipeline,
and clearing browser data loses everything. Fine for one person trying it
out; it is the thing to fix before the whole desk relies on it. See
[DEPLOY.md](DEPLOY.md).
