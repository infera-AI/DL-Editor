import { AUTH_STORAGE_KEY } from "./auth.constants.js";

function readStoredAuth() {
  try {
    const stored = window.localStorage?.getItem(AUTH_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export { readStoredAuth };
