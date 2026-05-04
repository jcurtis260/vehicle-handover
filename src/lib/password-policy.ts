export const DEFAULT_PASSWORD_MAX_AGE_DAYS = 30;
export const MIN_PASSWORD_MAX_AGE_DAYS = 1;
export const MAX_PASSWORD_MAX_AGE_DAYS = 365;

export function normalizePasswordMaxAgeDays(
  value: number | null | undefined
): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_PASSWORD_MAX_AGE_DAYS;
  }
  return Math.min(
    MAX_PASSWORD_MAX_AGE_DAYS,
    Math.max(MIN_PASSWORD_MAX_AGE_DAYS, Math.floor(value))
  );
}

export function isPasswordExpired(
  passwordChangedAt: Date | null | undefined,
  passwordMaxAgeDays: number | null | undefined
): boolean {
  if (!passwordChangedAt) return true;
  const maxAgeDays = normalizePasswordMaxAgeDays(passwordMaxAgeDays);
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  return Date.now() - passwordChangedAt.getTime() >= maxAgeMs;
}

export function getPasswordAgeDays(passwordChangedAt: Date | null | undefined): number | null {
  if (!passwordChangedAt) return null;
  return Math.floor((Date.now() - passwordChangedAt.getTime()) / (24 * 60 * 60 * 1000));
}
