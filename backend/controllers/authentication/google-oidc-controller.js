import crypto from 'crypto'
import { Employee } from '../../models/employee-management/employee-model.js'
import { createJWT } from './auth-controller.js'

// "Sign in with Google": OpenID Connect Authorization Code flow with PKCE.
//   1. /api/auth/google           -> redirect the browser to Google's authorization endpoint
//   2. Google authenticates the user and asks for consent
//   3. /api/auth/google/callback  <- Google redirects back with ?code&state
//   4. back-channel POST to Google's token endpoint: code + client secret + PKCE verifier
//   5. validate the ID token, match the verified email to an Employee, issue our app JWT
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com']
const FLOW_TTL_MS = 10 * 60 * 1000

// Pending logins keyed by `state`, kept for 10 minutes. In memory because the app
// runs as a single process; a multi-instance deployment would move this to Redis.
const pending = new Map()

const b64url = (buf) => buf.toString('base64url')
const frontend = () => (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').split(',')[0]

function config() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error('Google sign-in is not configured')
  }
  return { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, redirectUri: GOOGLE_REDIRECT_URI }
}

function fail(res, reason) {
  return res.redirect(`${frontend()}/admin/auth/login?sso_error=${encodeURIComponent(reason)}`)
}

// Step 1: start the flow.
async function start(req, res) {
  try {
    const { clientId, redirectUri } = config()
    const state = b64url(crypto.randomBytes(24))        // CSRF protection for the callback
    const nonce = b64url(crypto.randomBytes(24))        // binds the ID token to this login
    const verifier = b64url(crypto.randomBytes(32))     // PKCE code_verifier
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest())

    for (const [key, flow] of pending) if (flow.expires < Date.now()) pending.delete(key)
    pending.set(state, { nonce, verifier, expires: Date.now() + FLOW_TTL_MS })

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      nonce,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
    })
    res.redirect(`${AUTH_ENDPOINT}?${params}`)
  } catch (err) {
    console.error('google sign-in start failed:', err.message)
    fail(res, 'not_configured')
  }
}

// Steps 3-5: handle Google's redirect.
async function callback(req, res) {
  try {
    const { clientId, clientSecret, redirectUri } = config()
    const { code, state, error } = req.query
    if (error) return fail(res, 'denied')                       // user pressed Cancel
    if (typeof code !== 'string' || typeof state !== 'string') return fail(res, 'invalid_request')

    const flow = pending.get(state)
    pending.delete(state)                                       // state is single-use
    if (!flow || flow.expires < Date.now()) return fail(res, 'invalid_state')

    // Back-channel code exchange: the client secret and PKCE verifier never touch the browser.
    const tokenRes = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
        code_verifier: flow.verifier,
      }),
    })
    const tokens = await tokenRes.json()
    if (!tokenRes.ok || !tokens.id_token) {
      console.error('google token exchange failed:', tokens.error)
      return fail(res, 'token_exchange')
    }

    // The ID token came straight from Google's token endpoint over TLS, which
    // OIDC Core 3.1.3.7 accepts in place of a signature check; the claims are
    // still validated.
    const claims = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString())
    const now = Math.floor(Date.now() / 1000)
    if (!ISSUERS.includes(claims.iss)) return fail(res, 'bad_issuer')
    if (claims.aud !== clientId) return fail(res, 'bad_audience')
    if (!claims.exp || claims.exp < now) return fail(res, 'expired')
    if (claims.nonce !== flow.nonce) return fail(res, 'bad_nonce')
    if (claims.email_verified !== true || typeof claims.email !== 'string') return fail(res, 'unverified_email')

    // Only existing staff may sign in; Google proves the email, HR decides who is an employee.
    const employee = await Employee.findOne({ email: claims.email })
    if (!employee) return fail(res, 'no_account')
    if (employee.googleSub && employee.googleSub !== claims.sub) return fail(res, 'account_mismatch')
    if (!employee.googleSub) {
      employee.googleSub = claims.sub                           // link the Google account on first use
      await employee.save()
    }

    // Hand our own short-lived JWT to the SPA in the URL fragment: fragments are
    // never sent to servers, so it stays out of access logs and Referer headers.
    res.redirect(`${frontend()}/admin/auth/google-callback#token=${createJWT(employee)}`)
  } catch (err) {
    console.error('google sign-in callback failed:', err.message)
    fail(res, 'server_error')
  }
}

export { start, callback }
