// Fail fast when a required secret is missing instead of running with an
// undefined JWT key or database URL (previously these were only checked inside
// individual controllers, and some code paths used a different variable).
const REQUIRED = ["DATABASE_URL", "SECRET"];

const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

if (process.env.SECRET.length < 32) {
  console.error("SECRET must be at least 32 characters (use: openssl rand -hex 32)");
  process.exit(1);
}
