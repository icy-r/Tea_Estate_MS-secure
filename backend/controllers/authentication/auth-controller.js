import jwt from 'jsonwebtoken'

import { Employee } from '../../models/employee-management/employee-model.js'
import { Profile } from '../../models/user-management/profile-model.js'
import { pick } from '../../utils/pick.js'

const SIGNUP_FIELDS = ['firstName', 'lastName', 'Id', 'email', 'age', 'gender', 'dateOfBirth',
  'contactNumber', 'designation', 'department', 'dateOfJoining', 'salary', 'leavesLeft', 'address', 'password']

async function signup(req, res) {
  try {
    if (!process.env.SECRET) throw new Error('no SECRET in back-end .env')
    if (!process.env.CLOUDINARY_URL) {
      throw new Error('no CLOUDINARY_URL in back-end .env file')
    }

    const data = pick(req.body, SIGNUP_FIELDS)
    const user = await Employee.findOne({ email: data.email })
    if (user) throw new Error('Account already exists')

    const newProfile = await Profile.create({ name: `${data.firstName} ${data.lastName}` })
    req.body.profile = newProfile._id
    const newEmployee = await Employee.create({ ...data, profile: newProfile._id })

    const token = createJWT(newEmployee)
    res.status(200).json({ token })
  } catch (err) {
    console.log(err)
    try {
      if (req.body.profile) {
        await Profile.findByIdAndDelete(req.body.profile)
      }
    } catch (err) {
      console.log(err)
      return res.status(500).json({ err: err.message })
    }
    res.status(500).json({ err: err.message })
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body
    // Reject non-string credentials outright (defence in depth on top of
    // mongoose sanitizeFilter): an object here is an injection attempt.
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ err: 'Invalid credentials format' })
    }

    const user = await Employee.findOne({ email }).select('+password');
    if (!user) throw new Error("Employee not found");

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new Error("Incorrect password");

    const token = createJWT(user);
    res.json({ token });
  } catch (err) {
    handleAuthError(err, res);
  }
}

async function changePassword(req, res) {
  try {
    const user = await Employee.findById(req.user._id).select('+password')
    if (!user) throw new Error('Employee not found')

    // comparePassword is async: without await it returns a Promise, which is
    // always truthy, so the current-password check could never fail.
    const isMatch = await user.comparePassword(String(req.body.password))
    if (!isMatch) throw new Error('Incorrect password')

    const newPassword = req.body.newPassword
    if (typeof newPassword !== 'string' || newPassword.length < 10) {
      return res.status(400).json({ err: 'New password must be at least 10 characters' })
    }

    user.password = newPassword
    await user.save()

    const token = createJWT(user)
    res.json({ token })
    
  } catch (err) {
    handleAuthError(err, res)
  }
}

/* --== Helper Functions ==-- */

function handleAuthError(err, res) {
  console.log(err)
  const { message } = err
  if (message === 'Employee not found' || message === 'Incorrect password') {
    res.status(401).json({ err: message })
  } else {
    res.status(500).json({ err: message })
  }
}

// Only non-sensitive identity claims go into the token. A JWT is signed, not
// encrypted: anyone holding it can base64-decode the payload, so the password
// hash, salary, address etc. must never be included.
function createJWT(user) {
  const claims = {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    designation: user.designation,
    department: user.department,
  }
  return jwt.sign({ user: claims }, process.env.SECRET, { expiresIn: '8h' })
}

export { signup, login, changePassword, createJWT }