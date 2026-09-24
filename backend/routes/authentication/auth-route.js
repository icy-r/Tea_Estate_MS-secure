import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { decodeUserFromToken, checkAuth, requireRole } from '../../middleware/auth-mid.js'
import * as authCtrl from '../../controllers/authentication/auth-controller.js'

const router = Router()

// Brute-force protection: 10 failed attempts per IP per 15 minutes. Successful
// logins are not counted, so a user who types the password right is never blocked.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { err: 'Too many login attempts, try again in 15 minutes' },
})

/*---------- Public Routes ----------*/
router.post('/login', loginLimiter, authCtrl.login)

/*---------- Protected Routes ----------*/
router.use(decodeUserFromToken)
// Creating staff accounts is an Employee Manager task, not public self-service.
router.post('/signup', checkAuth, requireRole('Employee Manager'), authCtrl.signup)
router.post('/change-password', checkAuth, loginLimiter, authCtrl.changePassword)

export { router }
