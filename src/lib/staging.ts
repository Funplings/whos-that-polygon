/**
 * The staging build: a Vercel preview of the `staging` branch, built with
 * VITE_STAGING=true (a branch-scoped env var in the Vercel project). Kept in
 * its own module so lib/ and game/ can both check it without importing each
 * other. Production never sets it.
 */
export const STAGING = import.meta.env.VITE_STAGING === 'true'
