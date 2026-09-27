import multer from 'multer'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'

// Uploaded files live outside any static/web root and get random names, so a
// client can neither choose the stored path nor overwrite existing files.
const UPLOAD_DIR = path.resolve('uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + IMAGE_TYPES[file.mimetype]),
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (IMAGE_TYPES[file.mimetype]) return cb(null, true)
    const err = new Error('Only JPEG, PNG or WebP images are allowed')
    err.status = 400
    cb(err)
  },
})

// Multipart forms that carry text fields only (e.g. the vehicle form); any file is rejected.
const textOnlyForm = multer({ limits: { fields: 50, fieldSize: 100 * 1024 } }).none()

export { imageUpload, textOnlyForm }
