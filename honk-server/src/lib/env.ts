// Credential resolution. A named account PREFIXES the env key with ACCOUNT__
// (e.g. PROTOCODE__X_API_KEY); omitting the account uses the bare key. Prefix
// (not suffix) so every credential for one account shares a single ACCOUNT__
// prefix — a future UI can enumerate an account's creds with one scan, and they
// sort together in the environment. Default creds are the bare, unprefixed keys.

export function env(key: string, account = ''): string | undefined {
  return account ? process.env[`${account.toUpperCase()}__${key}`] : process.env[key];
}

// True only when every key in `keys` resolves to a non-empty value.
export function hasAll(keys: string[], account = ''): boolean {
  return keys.every(k => {
    const v = env(k, account);
    return v !== undefined && v !== null && v !== '';
  });
}

// Discover named-account prefixes present in the environment for a credential
// key. Given X_API_KEY and env PROTOCODE__X_API_KEY, PERSONAL__X_API_KEY,
// returns ['personal', 'protocode'] (lowercased). Anchors on the known key as
// the suffix, so an account name is whatever precedes __<key> — the bare
// default key (no prefix) never matches.
export function discoverAccounts(key: string): string[] {
  const suffix = `__${key}`;
  return Object.keys(process.env)
    .filter(k => k.endsWith(suffix) && k.length > suffix.length && process.env[k])
    .map(k => k.slice(0, -suffix.length).toLowerCase())
    .sort();
}
