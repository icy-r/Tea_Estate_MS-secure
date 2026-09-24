import jwt from 'jsonwebtoken'

const SECRET = process.env.SECRET

// Reads the bearer token (if any) and attaches the verified claims to req.user.
// A missing token leaves req.user unset; requireAuth decides whether that is allowed.
const decodeUserFromToken = (req, res, next) => {
  let token = req.get('Authorization')
  if (!token || token === 'Bearer null' || token === 'Bearer undefined') return next()

  token = token.replace('Bearer ', '')
  // Pin the algorithm so a token signed with anything else (e.g. "none") is rejected.
  jwt.verify(token, SECRET, { algorithms: ['HS256'] }, (err, decoded) => {
    if (err) return res.status(401).json({ err: 'Invalid or expired token' })

    req.user = decoded.user
    next()
  })
}

function checkAuth(req, res, next) {
  return req.user ? next() : res.status(401).json({ err: 'Not Authorized' })
}

// Endpoints reachable without logging in: method + exact path or path prefix.
const PUBLIC_ROUTES = [
  ['POST', /^\/api\/auth\/login$/],
  ['GET', /^\/api\/auth\/google(\/callback)?$/],
  ['GET', /^\/api\/applicantRoles(\/[\w-]+)?$/], // public careers / vacancies page
  ['POST', /^\/api\/applicantManagement\/?$/],   // job application form
]

// Default-deny: every /api route needs a valid token unless it is listed above.
function requireAuth(req, res, next) {
  if (req.method === 'OPTIONS') return next()
  const path = req.originalUrl.split('?')[0]
  const isPublic = PUBLIC_ROUTES.some(([method, re]) => method === req.method && re.test(path))
  if (isPublic || req.user) return next()
  return res.status(401).json({ err: 'Not Authorized' })
}

// Allows the request only if the logged-in employee holds one of the designations.
function requireRole(...designations) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ err: 'Not Authorized' })
    if (!designations.includes(req.user.designation)) {
      return res.status(403).json({ err: 'Forbidden' })
    }
    next()
  }
}

const MANAGERS = [
  'Employee Manager', 'Inventory Manager', 'Field Manager', 'Supply Manager', 'Transport Manager',
  'Product Manager', 'Sales Manager', 'Repair Manager',
]

export { decodeUserFromToken, checkAuth, requireAuth, requireRole, MANAGERS }
