// Stops internal error details reaching clients. About 100 controller catch
// blocks do res.status(500).json({ error: error }), which serialises the raw
// Mongoose error (model name, field path, value, stack-derived text). This
// wraps res.json once so any Error object in an `error`/`err` field is logged
// server-side and replaced with a generic message.
const GENERIC = {
  CastError: 'Invalid identifier',
  ValidationError: 'Invalid input',
  MongoServerError: 'Request could not be completed',
}

function sanitize(value) {
  if (value && typeof value === 'object' && (value instanceof Error || value.name || value.errors)) {
    return GENERIC[value.name] || 'Something went wrong'
  }
  return value
}

export function safeErrors(req, res, next) {
  const json = res.json.bind(res)
  res.json = (body) => {
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      for (const key of ['error', 'err']) {
        if (key in body && typeof body[key] === 'object' && body[key] !== null) {
          console.error(`[${req.method} ${req.originalUrl}]`, body[key])
          body = { ...body, [key]: sanitize(body[key]) }
          if (body[key] === GENERIC.CastError && res.statusCode >= 500) res.status(400)
        }
      }
    }
    return json(body)
  }
  next()
}
