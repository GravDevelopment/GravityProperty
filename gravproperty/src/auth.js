// Sign-in with the company Microsoft account. Microsoft verifies the
// credentials and the tenant restriction — the Azure app registration itself
// is locked to a single tenant (gravitygh.co.za), so a login from any other
// organisation is rejected before this code ever runs. There is nothing
// client-side to bypass; this module just drives the redirect flow.
import { PublicClientApplication } from '@azure/msal-browser'

const clientId = import.meta.env.VITE_MSAL_CLIENT_ID
const tenantId = import.meta.env.VITE_MSAL_TENANT_ID || 'organizations'

// Lets the app run (with a setup notice) before Azure is configured, instead
// of crashing on a missing env var.
export const configured = Boolean(clientId)

export const msal = configured
  ? new PublicClientApplication({
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        redirectUri: window.location.origin,
      },
      cache: { cacheLocation: 'sessionStorage' },
    })
  : null

let ready
export const initAuth = () => {
  if (!msal) return Promise.resolve()
  ready ??= msal.initialize().then(() => msal.handleRedirectPromise())
  return ready
}

export const getAccount = () => msal?.getAllAccounts()[0] ?? null

export const signIn = () => msal.loginRedirect({ scopes: ['User.Read'] })

export const signOut = () => msal.logoutRedirect({ account: getAccount() })
