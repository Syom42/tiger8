export const BOOTSTRAP_CACHE_KEY = "tiger8_bootstrap_cache";
export const WORKOUT_DRAFT_KEY = "tiger8_active_workout_draft";

export function readStoredValue<T>(key: string): T | null {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

export function writeStoredValue(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
}

export function clearStoredValue(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
}
