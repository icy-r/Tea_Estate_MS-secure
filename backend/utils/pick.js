// Copies only the allow-listed keys from a request body. Used instead of passing
// req.body straight to Model.create / Object.assign (mass assignment, CWE-915).
export function pick(source, allowed) {
  const out = {}
  for (const key of allowed) {
    if (source && Object.prototype.hasOwnProperty.call(source, key)) out[key] = source[key]
  }
  return out
}
