import { configured, signIn } from './auth'
import { IconBuilding } from './icons'

function Login() {
  return (
    <div className="login-screen">
      <div className="login-card">
        <span className="brand-mark"><IconBuilding /></span>
        <h1>GravProperty</h1>
        <p className="tagline">Tenant onboarding pipeline</p>

        {configured ? (
          <button type="button" className="ms-signin" onClick={signIn}>
            <MsLogo /> Sign in with Microsoft
          </button>
        ) : (
          <p className="login-notice">
            Sign-in isn't configured yet. Set <code>VITE_MSAL_CLIENT_ID</code> and{' '}
            <code>VITE_MSAL_TENANT_ID</code> for the gravitygh.co.za Azure app
            registration — see <code>AUTH_SETUP.md</code>.
          </p>
        )}
      </div>
    </div>
  )
}

const MsLogo = () => (
  <svg viewBox="0 0 21 21" width="16" height="16">
    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
  </svg>
)

export default Login
