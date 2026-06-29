// Credential resolution. A named account suffixes the env key with __ACCOUNT
// (e.g. X_API_KEY__BRAND); omitting the account uses the bare key.

export function env(key, account = '') {
  return account ? process.env[`${key}__${account.toUpperCase()}`] : process.env[key];
}

// True only when every key in `keys` resolves to a non-empty value.
export function hasAll(keys, account = '') {
  return keys.every(k => {
    const v = env(k, account);
    return v !== undefined && v !== null && v !== '';
  });
}

// Discover named-account suffixes present in the environment for a credential
// key. Given X_API_KEY and env X_API_KEY__BRAND, X_API_KEY__PERSONAL, returns
// ['brand', 'personal'] (lowercased).
export function discoverAccounts(key) {
  const prefix = `${key}__`;
  return Object.keys(process.env)
    .filter(k => k.startsWith(prefix) && process.env[k])
    .map(k => k.slice(prefix.length).toLowerCase())
    .sort();
}
