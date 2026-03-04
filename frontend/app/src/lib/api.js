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

export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, url?: string, bodyText?: string }} meta
   */
  constructor(message, meta = {}) {
    super(message);
    this.name = "ApiError";
    this.status = meta.status;
    this.url = meta.url;
    this.bodyText = meta.bodyText;
  }
}

/**
 * Internal: sleep helper for retry backoff.
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Internal: merges AbortSignals (caller + timeout).
 * @param {AbortSignal | undefined} a
 * @param {AbortSignal | undefined} b
 */
function anySignal(a, b) {
  if (!a) return b;
  if (!b) return a;

  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();

  if (a.aborted || b.aborted) {
    ctrl.abort();
    return ctrl.signal;
  }

  a.addEventListener("abort", onAbort, { once: true });
  b.addEventListener("abort", onAbort, { once: true });
  return ctrl.signal;
}

/**
 * A wrapper around fetch to avoid repeating API_BASE and auth headers,
 * plus: timeout, retries, and default 401 handling (logout).
 *
 * IMPORTANT: This keeps the old behavior: it returns the native Response.
 *
 * @param {string} path e.g. "/notes" or "/ai/jobs"
 * @param {object} options fetch options + optional:
 *  - token: string
 *  - timeoutMs: number (default 12000)
 *  - retries: number (default 1)  // total attempts = retries + 1
 *  - retryDelayMs: number (default 350)
 *  - onUnauthorized: function(res)  // optional hook on 401
 */
export async function apiFetch(path, options = {}) {
  const {
    token,
    headers,
    timeoutMs = 12000,
    retries = 1,
    retryDelayMs = 350,
    onUnauthorized,
    signal,
    ...rest
  } = options;

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  // Timeout controller (per attempt)
  const makeTimeoutSignal = () => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    return { signal: ctrl.signal, clear: () => clearTimeout(t) };
  };

  let lastErr = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const timeout = makeTimeoutSignal();
    const mergedSignal = anySignal(signal, timeout.signal);

    try {
      const res = await fetch(url, {
        ...rest,
        signal: mergedSignal,
        headers: buildHeaders(token, headers || {}),
      });

      timeout.clear();

      // Default 401 behavior: clear token so app can re-login cleanly
      if (res.status === 401) {
        try {
          localStorage.removeItem("token");
        } catch (_) {}

        if (typeof onUnauthorized === "function") {
          try {
            onUnauthorized(res);
          } catch (_) {}
        }
      }

      return res;
    } catch (err) {
      timeout.clear();
      lastErr = err;

      // If aborted (timeout or caller abort), do not retry
      if (err?.name === "AbortError") break;

      // retry if attempts remain
      if (attempt < retries) {
        await sleep(retryDelayMs * (attempt + 1)); // simple backoff
        continue;
      }

      break;
    }
  }

  throw lastErr || new ApiError("Network/server error", { url });
}

/**
 * Convenience: fetch + parse JSON, throwing ApiError on non-2xx.
 * Use this when you want cleaner code in pages/components.
 */
export async function apiFetchJson(path, options = {}) {
  const res = await apiFetch(path, options);

  if (!res.ok) {
    let bodyText = "";
    try {
      bodyText = await res.text();
    } catch (_) {}

    throw new ApiError(`Request failed (${res.status})`, {
      status: res.status,
      url: res.url,
      bodyText,
    });
  }

  // empty body safe-guard
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (_) {
    throw new ApiError("Invalid JSON response", {
      status: res.status,
      url: res.url,
      bodyText: text,
    });
  }
}