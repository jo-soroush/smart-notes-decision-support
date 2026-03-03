// src/lib/api.js

export const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) ||
  "http://127.0.0.1:8000";

/**
 * Builds headers for API requests (optionally with JWT).
 * @param {string | null | undefined} token
 * @param {object} extra
 * @returns {HeadersInit}
 */
export function buildHeaders(token, extra = {}) {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

/**
 * A small wrapper around fetch to avoid repeating API_BASE and auth headers.
 * @param {string} path e.g. "/notes" or "/api/integrations/mis/runs"
 * @param {object} options fetch options + optional { token }
 */
export async function apiFetch(path, options = {}) {
  const { token, headers, ...rest } = options;

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  return fetch(url, {
    ...rest,
    headers: buildHeaders(token, headers || {}),
  });
}