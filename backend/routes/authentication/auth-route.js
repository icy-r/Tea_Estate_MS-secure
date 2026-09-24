import { Router } from 'express'
import { decodeUserFromToken, checkAuth, requireRole } from '../../middleware/auth-mid.js'
import * as authCtrl from '../../controllers/authentication/auth-controller.js'

const router = Router()

/*---------- Public Routes ----------*/
router.post('/login', authCtrl.login)

/*---------- Protected Routes ----------*/
router.use(decodeUserFromToken)
// Creating staff accounts is an Employee Manager task, not public self-service.
router.post('/signup', checkAuth, requireRole('Employee Manager'), authCtrl.signup)
router.post('/change-password', checkAuth, authCtrl.changePassword)

export { router }
