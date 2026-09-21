# Setting up "Sign in with Microsoft" (gravitygh.co.za only)

The app uses real Microsoft OAuth (via `@azure/msal-browser`) so that only
people with a `@gravitygh.co.za` work account can get in. Microsoft verifies
the sign-in and the tenant restriction — nothing in this app's code decides
who's allowed in, so there's no client-side check to bypass.

You'll need access to the **Azure Portal** for the gravitygh.co.za tenant
(ask whoever administers your Microsoft 365 / Entra ID if that's not you).

## 1. Register the app

1. Go to [portal.azure.com](https://portal.azure.com) → **Microsoft Entra ID**
   → **App registrations** → **New registration**.
2. Name: `GravProperty` (or whatever you like).
3. **Supported account types**: choose **Accounts in this organizational
   directory only (gravitygh.co.za only – Single tenant)**. This is the
   actual access control — Microsoft rejects any other organisation's
   account before it ever reaches this app.
4. **Redirect URI**: platform **Single-page application (SPA)**, value
   `http://localhost:63734` for local dev (that's the port set in
   `vite.config.js`). Add your real deployed URL here too once you host it
   (you can list more than one).
5. Click **Register**.

## 2. Grab the IDs

On the app's **Overview** page, copy:
- **Application (client) ID** → `VITE_MSAL_CLIENT_ID`
- **Directory (tenant) ID** → `VITE_MSAL_TENANT_ID`

## 3. API permissions (optional but tidy)

**API permissions** → confirm `User.Read` (Microsoft Graph, delegated) is
present — it's added by default and is all this app asks for (just enough
to read the signed-in user's name and email).

## 4. Configure the app

In `gravproperty/`, copy `.env.example` to `.env.local` and paste in the two
IDs from step 2:

```
VITE_MSAL_CLIENT_ID=<application-client-id>
VITE_MSAL_TENANT_ID=<directory-tenant-id>
```

Restart `npm run dev`. You should now see "Sign in with Microsoft" instead
of the setup notice.

## Deploying

Wherever this ends up hosted, add that URL as another SPA redirect URI on
the app registration (step 1.4), and set the same two env vars in that
host's environment/build settings.
