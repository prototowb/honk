// Hardened outbound HTTP for every platform/API call (INIT-006).
//
// 1. TIMEOUT — the bare global `fetch` has none, so a hung Graph API call
//    would hang an MCP tool response (or a scheduler tick) forever. Every
//    adapter imports `fetchWithTimeout` aliased AS `fetch`, so call sites stay
//    untouched and new call sites in those files get the timeout for free.
//    Default 30s; override via HONK_HTTP_TIMEOUT_MS (e.g. slow video uploads).
//
// 2. REDACTION — platform error bodies (and some request URLs — the Graph API
//    carries `access_token=` in the query string) can echo credentials. Error
//    text is persisted to the audit log and shown to the agent, so
//    `redactSecrets` scrubs token-shaped material at the audit/throw boundary
//    (lib/audit.ts + lib/dispatch.ts). Scrub-at-boundary, not per call site,
//    so a new adapter can't forget it.
export function httpTimeoutMs() {
    const v = Number(process.env.HONK_HTTP_TIMEOUT_MS);
    return Number.isFinite(v) && v > 0 ? v : 30_000;
}
export function fetchWithTimeout(url, init = {}) {
    return fetch(url, { signal: AbortSignal.timeout(httpTimeoutMs()), ...init });
}
const SECRET_PATTERNS = [
    // Query-string credentials: ?access_token=… &api_key=… (Graph, imgbb, …)
    /([?&](?:access_token|api_key|apikey|key|token|app_secret|client_secret|signature)=)[^&\s"'\\]+/gi,
    // Authorization headers / bearer tokens quoted in error text.
    /\b(Bearer\s+)[A-Za-z0-9._~+/-]{8,}=*/g,
    /\b(OAuth\s+)[^\r\n]{8,}/g,
    // JSON-embedded credentials: "access_token":"…"
    /("(?:access_token|api_key|app_secret|client_secret|accessJwt|refreshJwt|password)"\s*:\s*")[^"]+(")/gi,
];
// Scrub token-shaped material from text that will be persisted or surfaced.
// Conservative by design: it redacts credential *carriers* (named params,
// auth headers, known JSON keys), not anything that merely looks random.
export function redactSecrets(text) {
    let out = text;
    out = out.replace(SECRET_PATTERNS[0], '$1[REDACTED]');
    out = out.replace(SECRET_PATTERNS[1], '$1[REDACTED]');
    out = out.replace(SECRET_PATTERNS[2], '$1[REDACTED]');
    out = out.replace(SECRET_PATTERNS[3], '$1[REDACTED]$2');
    return out;
}
