/**
 * Shared by the change-password form, its API route, the seed and the
 * recovery script, so the rules can't drift between them.
 */
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

/** Same cost the seed has always used. */
export const BCRYPT_COST = 12;
