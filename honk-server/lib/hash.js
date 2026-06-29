import crypto from 'crypto';

// Short, stable fingerprint of post content for the audit trail. Lets you tell
// whether two records published the same thing without storing the payload.
export function hashContent(content) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(content ?? null))
    .digest('hex')
    .slice(0, 16);
}
