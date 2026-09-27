# V2, V3, V12 and Google OpenID Connect – Asath M M (IT22633422)

## V2 – Broken access control (OWASP A01, CWE-862 / CWE-284)

**What was wrong.** Authentication was opt-in. Each router had to remember to add the
token middleware, and the middleware itself let requests through when no token was sent:

```js
let token = req.get('Authorization')
if (!token) return next()          // anonymous request carries on
```

Whole modules (applicant management, order tracking, repair logs, sales) never added a check,
and no route looked at the caller's role. With no token at all:

- `GET /api/employees` returned every staff record: salary, address, contact details.
- `GET /api/applicantManagement` returned every job applicant's NIC, email and CV link.

A logged-in labourer could also list and edit every employee.

**Why it matters.** This is the most common real-world web vulnerability: the data is exposed
not by a clever exploit but because nobody asked "who is calling?".

**How we fixed it (commit `ff0d461`).**
- Deny by default: `app.use("/api", decodeUserFromToken, requireAuth)` in `server.js`. Every API
  route now needs a valid token unless it is on a short public list in `middleware/auth-mid.js`:
  login, the Google sign-in endpoints, the public vacancies list and the job-application form.
- `requireRole(...designations)` returns 401 without a user and 403 for the wrong designation.
  Employee records are for managers and supervisors, staff creation for the Employee Manager.
- An invalid or expired token now gets 401 instead of reaching the error handler.
- Frontend: `services/auth-interceptor.js` attaches the token to every API request, because
  many pages imported axios directly and never sent it.

**How to prove it.** `security-tests/poc.sh` checks V2: no token → 401, Labour → 403,
Employee Manager → 200, public vacancies still 200.

## V3 – Password hash inside the JWT (OWASP A02 / A04, CWE-522 / CWE-312)

**What was wrong.** `createJWT` signed the whole Mongoose employee document:

```js
jwt.sign({ user }, process.env.SECRET, { expiresIn: '24h' })
```

A JWT is **signed, not encrypted**: anyone holding it can base64-decode the middle part. Decoding
a token showed `"password": "$2b$06$..."`, the salary, address and date of birth. The token lived in
`localStorage`, and `GET /api/employees` returned the same hashes for everyone. With a bcrypt cost
of 6 those hashes are cheap to crack offline.

**How we fixed it (commit `3e61322`).**
- The token now carries only `_id`, name, email, designation and department, and lasts 8 hours.
- The `password` field is `select: false`, so no query returns it unless it explicitly asks
  (only login and change-password do).
- bcrypt cost raised from 6 to 12 (about 250 ms per hash) for new passwords.

## V12 – Duplicate authentication system (OWASP A02 / A07, CWE-798 / CWE-613)

**What was wrong.** A second, older auth system was still in the code: `user-auth-controller.js`,
`user-auth-route.js` and `get-employee-id-route.js`. It signed tokens with a different variable
(`JWT_SECRET`) and **no expiry**, it exposed `userRegister`, `userGetAll` and `userDelete` with no
authentication, and it verified tokens without pinning the algorithm. The routes were imported but
not mounted, so one line in `server.js` would have made them live.

**How we fixed it (commit `5bd2d21`).** We deleted the three files, so `SECRET` is the only
signing key (checked at startup). Verification pins `algorithms: ['HS256']`, and the frontend's
`userLogin()` now uses the single employee login.

**Lesson.** Dead code is still attack surface; unused features should be removed, not left unmounted.

## Google OpenID Connect – "Sign in with Google" (commits `3ba80e8`, `5fd3314`)

We used the **Authorization Code grant with PKCE**, which RFC 9700 (OAuth 2.0 Security Best
Current Practice) recommends, with Google as the OpenID Provider.

| Step | What happens | Security point |
|---|---|---|
| 1 | Button opens `GET /api/auth/google`; backend creates `state`, `nonce` and a PKCE `code_verifier`, keeps them 10 min, redirects to Google with `code_challenge` = SHA-256 of the verifier | `state` stops CSRF on the callback; PKCE stops a stolen code from being used |
| 2 | Google authenticates the user and shows consent for `openid email profile` | We never see the Google password |
| 3 | Google redirects to `/api/auth/google/callback?code&state` | `state` must match and is single-use |
| 4 | Backend POSTs the code, client secret and `code_verifier` to `oauth2.googleapis.com/token` | Back channel: secret and verifier never reach the browser |
| 5 | We check the ID token's `iss`, `aud`, `exp`, `nonce` and `email_verified` | `nonce` stops replay of an old token |
| 6 | The verified email must belong to an existing employee; Google's `sub` is linked on first use; we issue our own 8-hour JWT in the URL fragment | Google proves identity, HR still decides access; fragments are never sent to servers |

**OAuth vs OpenID Connect.** OAuth 2.0 gives an app access to resources; OpenID Connect adds an
**ID token** that tells the app who the user is. We need identity, so we use OIDC.

**Why not the implicit grant.** It returns tokens directly in the browser URL, where history,
extensions and Referer headers can leak them. The code flow keeps tokens on the server side.

**Tested live** with a real Google OAuth client: account chooser → consent → dashboard. Negative
cases: forged `state`, cancelled consent, and a Google account that is not an employee all return to
the login page with an error. The live run also found two issues, fixed in `5fd3314`: the callback's
code was being written to the request log, and React StrictMode ran the callback page twice.
